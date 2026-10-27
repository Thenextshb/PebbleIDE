/**
 * Shared projects: upload and update projects, upvote and save them, count views, and list them for the
 * home page (Featured, What people want featured, search) and profiles. Runs in PebbleIDE's Worker
 * (server/worker.js) next to the accounts in server/accounts.js.
 *
 * Project files and thumbnails are kept in an R2 bucket bound as PROJECT_FILES, or in a KV namespace
 * bound as PROJECT_FILES_KV (see server/SETUP.md). Everything else is in the D1 database.
 */

import {
    AccountError,
    getImageType,
    getSignedInUser,
    reply,
    requireSignedInUser,
    requireVerifiedUser,
    sha256,
    text
} from './accounts.js';

// Projects with this many upvotes are featured
const FEATURED_UPVOTES = 25;
// Owners can change a project once every 10 minutes
const CHANGE_WAIT_MINUTES = 10;
// And share a new project once a minute
const NEW_PROJECT_WAIT_SECONDS = 60;
const MAX_TITLE_LENGTH = 80;
const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_PROJECT_BYTES = 20 * 1024 * 1024;
// Thumbnails are shrunk to 480x360 before they're sent
const MAX_THUMBNAIL_BYTES = 512 * 1024;
const LIST_SIZE = 12;
const SEARCH_SIZE = 40;
const MINUTE = 60 * 1000;

const SUMMARY_COLUMNS = `projects.id, projects.title, projects.thumbnail_version, projects.upvotes, projects.views,
    projects.featured_at, projects.created_at, users.username, users.avatar_version`;

// Where project files and thumbnails are kept
const getStore = env => {
    if (env.PROJECT_FILES) {
        return {
            put: (key, data, type) => env.PROJECT_FILES.put(key, data, {httpMetadata: {contentType: type}}),
            get: async key => {
                const object = await env.PROJECT_FILES.get(key);
                return object && {body: object.body, type: object.httpMetadata && object.httpMetadata.contentType};
            },
            delete: key => env.PROJECT_FILES.delete(key)
        };
    }
    if (env.PROJECT_FILES_KV) {
        return {
            put: (key, data, type) => env.PROJECT_FILES_KV.put(key, data, {metadata: {type}}),
            get: async key => {
                const {value, metadata} = await env.PROJECT_FILES_KV.getWithMetadata(key, {type: 'arrayBuffer'});
                return value && {body: value, type: metadata && metadata.type};
            },
            delete: key => env.PROJECT_FILES_KV.delete(key)
        };
    }
    throw new Error('There\'s nowhere to keep project files: bind an R2 bucket as PROJECT_FILES ' +
        'or a KV namespace as PROJECT_FILES_KV');
};

const fileKey = id => `projects/${id}.pbp`;
const thumbnailKey = id => `thumbnails/${id}`;

const isFeatured = row => row.upvotes >= FEATURED_UPVOTES;

const summary = row => ({
    id: row.id,
    title: row.title,
    author: {
        username: row.username,
        avatarVersion: row.avatar_version
    },
    thumbnailVersion: row.thumbnail_version,
    upvotes: row.upvotes,
    views: row.views,
    featured: isFeatured(row),
    created: row.created_at
});

const findProject = async (env, id) => {
    const row = /^\d+$/.test(id) && await env.DB.prepare(
        `SELECT ${SUMMARY_COLUMNS}, projects.owner_id, projects.description, projects.changed_at,
            projects.file_version, projects.file_size
        FROM projects JOIN users ON users.id = projects.owner_id
        WHERE projects.id = ?`
    ).bind(Number(id))
        .first();
    if (!row) {
        throw new AccountError(404, 'no-project', 'This project doesn\'t exist, or it was deleted.');
    }
    return row;
};

const canDelete = (row, user) => !!user && (row.owner_id === user.id || ['moderator', 'admin'].includes(user.role));

const details = async (env, row, user) => {
    const mine = user ? await env.DB.prepare(
        `SELECT
            (SELECT COUNT(*) FROM project_upvotes WHERE user_id = ?1 AND project_id = ?2) AS upvoted,
            (SELECT COUNT(*) FROM project_saves WHERE user_id = ?1 AND project_id = ?2) AS saved`
    ).bind(user.id, row.id)
        .first() : {upvoted: 0, saved: 0};
    const isOwner = !!user && row.owner_id === user.id;
    return {
        ...summary(row),
        description: row.description,
        changed: row.changed_at,
        fileVersion: row.file_version,
        youUpvoted: Boolean(mine.upvoted),
        youSaved: Boolean(mine.saved),
        isOwner,
        canDelete: canDelete(row, user),
        // When the owner can change it next
        nextChangeAt: isOwner ? row.changed_at + (CHANGE_WAIT_MINUTES * MINUTE) : null
    };
};

const minutesUntil = time => Math.max(1, Math.ceil((time - Date.now()) / MINUTE));

// Reads the title, description, project file and thumbnail from an upload
const readUpload = async (request, {needsFile}) => {
    let form;
    try {
        form = await request.formData();
    } catch (e) {
        throw new AccountError(400, 'bad-request', 'That upload didn\'t come through. Please try again.');
    }
    const title = text(form.get('title')).replace(/\s+/g, ' ')
        .trim();
    const description = text(form.get('description')).replace(/\r\n?/g, '\n')
        .trim();
    if (!title) {
        throw new AccountError(400, 'no-title', 'Give your project a name.');
    }
    if (title.length > MAX_TITLE_LENGTH) {
        throw new AccountError(400, 'title-too-long',
            `Project names can't be longer than ${MAX_TITLE_LENGTH} characters.`);
    }
    if (description.length > MAX_DESCRIPTION_LENGTH) {
        throw new AccountError(400, 'description-too-long',
            `Descriptions can't be longer than ${MAX_DESCRIPTION_LENGTH} characters.`);
    }

    const upload = {title, description, project: null, thumbnail: null};
    const projectFile = form.get('project');
    if (projectFile && typeof projectFile.arrayBuffer === 'function') {
        const bytes = new Uint8Array(await projectFile.arrayBuffer());
        if (bytes.length > MAX_PROJECT_BYTES) {
            throw new AccountError(413, 'project-too-big',
                `Projects can't be bigger than ${MAX_PROJECT_BYTES / 1024 / 1024} MB. Try making sounds shorter ` +
                'or pictures smaller.');
        }
        // Project files are zip files
        if (bytes[0] !== 0x50 || bytes[1] !== 0x4b || bytes[2] !== 0x03 || bytes[3] !== 0x04) {
            throw new AccountError(400, 'bad-project', 'That isn\'t a project file.');
        }
        upload.project = bytes;
    } else if (needsFile) {
        throw new AccountError(400, 'bad-project', 'The project file is missing.');
    }

    const thumbnailFile = form.get('thumbnail');
    if (thumbnailFile && typeof thumbnailFile.arrayBuffer === 'function') {
        const bytes = new Uint8Array(await thumbnailFile.arrayBuffer());
        if (bytes.length > MAX_THUMBNAIL_BYTES) {
            throw new AccountError(413, 'thumbnail-too-big', 'That thumbnail is too big.');
        }
        const type = getImageType(bytes);
        if (!type) {
            throw new AccountError(400, 'bad-thumbnail', 'Thumbnails have to be PNG, JPEG or WebP images.');
        }
        upload.thumbnail = {bytes, type};
    }
    return upload;
};

// Projects get a random 10-digit number like 1773248604, so the numbers don't show how many projects there are
const makeProjectId = () => {
    const [high, low] = crypto.getRandomValues(new Uint32Array(2));
    // 53 random bits, as a number from 0 up to 1
    const fraction = (((high >>> 5) * 67108864) + (low >>> 6)) / 9007199254740992;
    return 1000000000 + Math.floor(fraction * 9000000000);
};

const shareProject = async ({request, env}) => {
    const user = await requireVerifiedUser(request, env);
    const last = await env.DB.prepare('SELECT MAX(created_at) AS created_at FROM projects WHERE owner_id = ?')
        .bind(user.id)
        .first();
    if (last && last.created_at && Date.now() - last.created_at < NEW_PROJECT_WAIT_SECONDS * 1000) {
        throw new AccountError(429, 'too-soon', 'You just shared a project. Wait a minute before sharing another.');
    }
    const upload = await readUpload(request, {needsFile: true});
    const now = Date.now();
    let id = null;
    // Picking a number that's already taken is very unlikely, but try again if it happens
    for (let attempt = 0; id === null; attempt++) {
        try {
            ({id} = await env.DB.prepare(
                `INSERT INTO projects (id, owner_id, title, description, created_at, changed_at, file_version,
                    file_size, thumbnail_version)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`
            ).bind(makeProjectId(), user.id, upload.title, upload.description, now, now, now,
                upload.project.length, upload.thumbnail ? now : null)
                .first());
        } catch (e) {
            if (attempt >= 4 || !String(e.message).includes('UNIQUE')) throw e;
        }
    }
    const store = getStore(env);
    try {
        await store.put(fileKey(id), upload.project, 'application/octet-stream');
        if (upload.thumbnail) await store.put(thumbnailKey(id), upload.thumbnail.bytes, upload.thumbnail.type);
    } catch (e) {
        // Don't leave a project with no file behind
        await env.DB.prepare('DELETE FROM projects WHERE id = ?').bind(id)
            .run();
        throw e;
    }
    return reply({project: await details(env, await findProject(env, String(id)), user)});
};

const updateProject = async ({request, env, id}) => {
    const user = await requireVerifiedUser(request, env);
    const row = await findProject(env, id);
    if (row.owner_id !== user.id) {
        throw new AccountError(403, 'not-yours', 'Only the person who shared this project can change it.');
    }
    const nextChange = row.changed_at + (CHANGE_WAIT_MINUTES * MINUTE);
    if (Date.now() < nextChange) {
        const minutes = minutesUntil(nextChange);
        throw new AccountError(429, 'too-soon',
            `You can change this project again in ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}.`);
    }
    const upload = await readUpload(request, {needsFile: false});
    const now = Date.now();
    const store = getStore(env);
    if (upload.project) await store.put(fileKey(row.id), upload.project, 'application/octet-stream');
    if (upload.thumbnail) await store.put(thumbnailKey(row.id), upload.thumbnail.bytes, upload.thumbnail.type);
    await env.DB.prepare(
        `UPDATE projects SET title = ?, description = ?, changed_at = ?,
            file_version = ?, file_size = ?, thumbnail_version = ?
        WHERE id = ?`
    ).bind(
        upload.title,
        upload.description,
        now,
        upload.project ? now : row.file_version,
        upload.project ? upload.project.length : row.file_size,
        upload.thumbnail ? now : row.thumbnail_version,
        row.id
    )
        .run();
    return reply({project: await details(env, await findProject(env, id), user)});
};

const deleteProject = async ({request, env, id}) => {
    const user = await requireSignedInUser(request, env);
    const row = await findProject(env, id);
    if (!canDelete(row, user)) {
        throw new AccountError(403, 'not-yours', 'Only the person who shared this project can delete it.');
    }
    await env.DB.prepare('DELETE FROM projects WHERE id = ?').bind(row.id)
        .run();
    const store = getStore(env);
    await Promise.all([store.delete(fileKey(row.id)), store.delete(thumbnailKey(row.id))]);
    return reply({deleted: true});
};

// Adds or removes a row in project_upvotes or project_saves; true if something changed
const toggle = async (env, table, user, row, on) => {
    const result = on ?
        await env.DB.prepare(`INSERT OR IGNORE INTO ${table} (user_id, project_id, created_at) VALUES (?, ?, ?)`)
            .bind(user.id, row.id, Date.now())
            .run() :
        await env.DB.prepare(`DELETE FROM ${table} WHERE user_id = ? AND project_id = ?`)
            .bind(user.id, row.id)
            .run();
    return result.meta.changes > 0;
};

const upvote = on => async ({request, env, id}) => {
    // A verified email makes it harder to upvote with lots of made-up accounts
    const user = await requireVerifiedUser(request, env);
    const row = await findProject(env, id);
    if (row.owner_id === user.id) {
        throw new AccountError(400, 'own-project', 'You can\'t upvote your own project.');
    }
    if (await toggle(env, 'project_upvotes', user, row, on)) {
        await env.DB.prepare(
            `UPDATE projects SET upvotes = upvotes + ?1,
                featured_at = CASE WHEN featured_at IS NULL AND upvotes + ?1 >= ?2 THEN ?3 ELSE featured_at END
            WHERE id = ?4`
        ).bind(on ? 1 : -1, FEATURED_UPVOTES, Date.now(), row.id)
            .run();
    }
    return reply({project: await details(env, await findProject(env, id), user)});
};

const save = on => async ({request, env, id}) => {
    const user = await requireSignedInUser(request, env);
    const row = await findProject(env, id);
    await toggle(env, 'project_saves', user, row, on);
    return reply({project: await details(env, row, user)});
};

const view = async ({request, env, id, body}) => {
    const user = await getSignedInUser(request, env);
    const row = await findProject(env, id);
    if (user && user.id === row.owner_id) {
        return reply({views: row.views});
    }
    // Each device counts once. Browsers that can't remember their device ID count once a day,
    // without keeping their address.
    const device = text(body.device);
    let viewer;
    if (/^[A-Za-z0-9-]{16,64}$/.test(device)) {
        viewer = `device:${await sha256(device)}`;
    } else {
        const day = new Date().toISOString()
            .slice(0, 10);
        viewer = `visitor:${await sha256(`${request.headers.get('CF-Connecting-IP') || 'unknown'} ${day}`)}`;
    }
    const result = await env.DB.prepare('INSERT OR IGNORE INTO project_views (project_id, viewer) VALUES (?, ?)')
        .bind(row.id, viewer)
        .run();
    if (result.meta.changes > 0) {
        await env.DB.prepare('UPDATE projects SET views = views + 1 WHERE id = ?').bind(row.id)
            .run();
        return reply({views: row.views + 1});
    }
    return reply({views: row.views});
};

const getDetails = async ({request, env, id}) => {
    const user = await getSignedInUser(request, env);
    return reply({project: await details(env, await findProject(env, id), user)});
};

// The person looking only matters for the "saved" list
const listProjects = async ({request, env}) => {
    const params = new URL(request.url).searchParams;
    const list = params.get('list') || 'recent';
    const select = `SELECT ${SUMMARY_COLUMNS} FROM projects JOIN users ON users.id = projects.owner_id`;
    let rows;
    if (list === 'featured') {
        rows = (await env.DB.prepare(
            `${select} WHERE projects.upvotes >= ? ORDER BY projects.featured_at DESC LIMIT ?`
        ).bind(FEATURED_UPVOTES, LIST_SIZE)
            .all()).results;
    } else if (list === 'wanted') {
        // Every project could show up, but each upvote makes it more likely
        const candidates = (await env.DB.prepare(
            `${select} WHERE projects.upvotes < ?
            ORDER BY projects.upvotes DESC, projects.created_at DESC LIMIT 300`
        ).bind(FEATURED_UPVOTES)
            .all()).results;
        rows = candidates
            .map(row => ({row, key: Math.pow(Math.random(), 1 / (row.upvotes + 1))}))
            .sort((a, b) => b.key - a.key)
            .slice(0, LIST_SIZE)
            .map(({row}) => row)
            .sort((a, b) => b.upvotes - a.upvotes);
    } else if (list === 'search') {
        const words = text(params.get('q')).trim()
            .slice(0, 100);
        if (!words) return reply({projects: []});
        const pattern = `%${words.replace(/[\\%_]/g, character => `\\${character}`)}%`;
        rows = (await env.DB.prepare(
            `${select} WHERE projects.title LIKE ?1 ESCAPE '\\' OR projects.description LIKE ?1 ESCAPE '\\'
                OR users.username LIKE ?1 ESCAPE '\\'
            ORDER BY projects.upvotes DESC, projects.created_at DESC LIMIT ?2`
        ).bind(pattern, SEARCH_SIZE)
            .all()).results;
    } else if (list === 'user') {
        rows = (await env.DB.prepare(
            `${select} WHERE users.username = ? ORDER BY projects.created_at DESC LIMIT 100`
        ).bind(text(params.get('user')))
            .all()).results;
    } else if (list === 'saved') {
        const user = await requireSignedInUser(request, env);
        rows = (await env.DB.prepare(
            `${select} JOIN project_saves ON project_saves.project_id = projects.id
            WHERE project_saves.user_id = ? ORDER BY project_saves.created_at DESC LIMIT 100`
        ).bind(user.id)
            .all()).results;
    } else {
        rows = (await env.DB.prepare(`${select} ORDER BY projects.created_at DESC LIMIT ?`)
            .bind(LIST_SIZE)
            .all()).results;
    }
    return reply({projects: rows.map(summary)});
};

const getFile = async ({request, env, id}) => {
    const row = await findProject(env, id);
    // Browsers keep a copy, and check whether it's still the newest one each time
    const etag = `"v${row.file_version}"`;
    if (request.headers.get('If-None-Match') === etag) {
        return new Response(null, {status: 304, headers: {ETag: etag}});
    }
    const file = await getStore(env).get(fileKey(row.id));
    if (!file) {
        throw new AccountError(404, 'no-file', 'This project\'s file is missing.');
    }
    return new Response(file.body, {
        headers: {
            'Content-Type': 'application/octet-stream',
            'Cache-Control': 'no-cache',
            'ETag': etag
        }
    });
};

const getThumbnail = async ({env, id}) => {
    const row = await findProject(env, id);
    const thumbnail = row.thumbnail_version && await getStore(env).get(thumbnailKey(row.id));
    if (!thumbnail) {
        return reply({error: 'no-thumbnail', message: 'This project has no thumbnail.'}, 404);
    }
    return new Response(thumbnail.body, {
        headers: {
            'Content-Type': thumbnail.type || 'image/webp',
            // Links to thumbnails include the version, so a new thumbnail gets a new link
            'Cache-Control': 'public, max-age=86400',
            'X-Content-Type-Options': 'nosniff'
        }
    });
};

const PROJECT_ACTIONS = {
    'update': {method: 'POST', body: 'upload', run: updateProject},
    'delete': {method: 'POST', run: deleteProject},
    'upvote': {method: 'POST', run: upvote(true)},
    'remove-upvote': {method: 'POST', run: upvote(false)},
    'save': {method: 'POST', run: save(true)},
    'unsave': {method: 'POST', run: save(false)},
    'view': {method: 'POST', run: view},
    'file': {method: 'GET', run: getFile},
    'thumbnail': {method: 'GET', run: getThumbnail}
};

const pickHandler = path => {
    if (path.length === 0) {
        return {
            GET: {method: 'GET', run: listProjects},
            POST: {method: 'POST', body: 'upload', run: shareProject}
        };
    }
    if (path.length === 1) {
        return {GET: {method: 'GET', run: getDetails}};
    }
    const action = path.length === 2 && Object.prototype.hasOwnProperty.call(PROJECT_ACTIONS, path[1]) &&
        PROJECT_ACTIONS[path[1]];
    return action ? {[action.method]: action} : null;
};

/**
 * Answer a request to /api/projects/...
 * @param {Request} request The request.
 * @param {object} env Cloudflare bindings and settings.
 * @param {string[]} path The parts of the address after /api/projects.
 * @returns {Promise<Response>} The response.
 */
const handleProjectRequest = async (request, env, path) => {
    const handlers = pickHandler(path);
    if (!handlers) {
        return reply({error: 'not-found', message: 'Not found.'}, 404);
    }
    const handler = handlers[request.method];
    if (!handler) {
        return reply({error: 'wrong-method', message: 'Not allowed.'}, 405, {Allow: Object.keys(handlers).join(', ')});
    }
    let body = {};
    if (handler.method === 'POST') {
        // Other websites can't send this header (or JSON) here without permission, so they can't use
        // someone's sign-in
        const contentType = request.headers.get('Content-Type') || '';
        const allowed = handler.body === 'upload' ?
            request.headers.get('X-Requested-With') === 'PebbleIDE' :
            contentType.startsWith('application/json');
        if (!allowed) {
            return reply({error: 'bad-request', message: 'That request isn\'t allowed.'}, 415);
        }
        if (handler.body !== 'upload') {
            try {
                body = await request.json();
            } catch (e) {
                body = null;
            }
            if (!body || typeof body !== 'object') {
                return reply({error: 'bad-request', message: 'Send JSON.'}, 400);
            }
        }
    }
    try {
        return await handler.run({request, env, id: path[0], body});
    } catch (e) {
        if (e instanceof AccountError) {
            return reply({error: e.code, message: e.message}, e.status);
        }
        // eslint-disable-next-line no-console
        console.error(e);
        return reply({error: 'server-error', message: 'Something went wrong on our end. Please try again.'}, 500);
    }
};

export {
    handleProjectRequest
};
