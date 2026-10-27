/**
 * Reports: anyone signed in can report a project or a user, and the PebbleIDE team (developers, moderators
 * and admins) can see the reports and mark them as dealt with. Runs in PebbleIDE's Worker (server/worker.js).
 */

import {AccountError, reply, requireSignedInUser, text} from './accounts.js';

const STAFF_ROLES = ['developer', 'moderator', 'admin'];
const REASONS = ['mean', 'scary', 'personal-info', 'copied', 'spam', 'other'];
const MAX_DETAILS_LENGTH = 500;
// So reports can't be used to spam the team
const REPORTS_PER_HOUR = 10;
const HOUR = 60 * 60 * 1000;

const requireStaff = async (request, env) => {
    const user = await requireSignedInUser(request, env);
    if (!STAFF_ROLES.includes(user.role)) {
        throw new AccountError(403, 'not-staff', 'Only the PebbleIDE team can see reports.');
    }
    return user;
};

const sendReport = async ({request, env, body}) => {
    const user = await requireSignedInUser(request, env);
    const kind = text(body.kind);
    const reason = text(body.reason);
    const details = text(body.details).trim();
    if (!REASONS.includes(reason)) {
        throw new AccountError(400, 'no-reason', 'Pick why you\'re reporting it.');
    }
    if (details.length > MAX_DETAILS_LENGTH) {
        throw new AccountError(400, 'details-too-long', `Keep it under ${MAX_DETAILS_LENGTH} characters.`);
    }

    let projectId = null;
    let userId = null;
    if (kind === 'project') {
        const project = /^\d+$/.test(String(body.target)) && await env.DB.prepare(
            'SELECT id, owner_id FROM projects WHERE id = ?'
        ).bind(Number(body.target))
            .first();
        if (!project) throw new AccountError(404, 'no-project', 'This project doesn\'t exist anymore.');
        if (project.owner_id === user.id) throw new AccountError(400, 'own', 'You can\'t report your own project.');
        projectId = project.id;
    } else if (kind === 'user') {
        const target = await env.DB.prepare('SELECT id FROM users WHERE username = ?')
            .bind(text(body.target))
            .first();
        if (!target) throw new AccountError(404, 'no-user', 'There\'s no PebbleIDE user with that name.');
        if (target.id === user.id) throw new AccountError(400, 'own', 'You can\'t report yourself.');
        userId = target.id;
    } else {
        throw new AccountError(400, 'bad-request', 'Report a project or a user.');
    }

    // Reporting the same thing twice doesn't make another report
    const existing = await env.DB.prepare(
        `SELECT id FROM reports WHERE reporter_id = ? AND resolved_at IS NULL
        AND project_id IS ? AND user_id IS ?`
    ).bind(user.id, projectId, userId)
        .first();
    if (existing) return reply({reported: true});

    const recent = await env.DB.prepare(
        'SELECT COUNT(*) AS count FROM reports WHERE reporter_id = ? AND created_at > ?'
    ).bind(user.id, Date.now() - HOUR)
        .first();
    if (recent.count >= REPORTS_PER_HOUR) {
        throw new AccountError(429, 'too-many', 'You\'ve sent a lot of reports. Try again in a little while.');
    }

    await env.DB.prepare(
        `INSERT INTO reports (reporter_id, kind, project_id, user_id, reason, details, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(user.id, kind, projectId, userId, reason, details, Date.now())
        .run();
    return reply({reported: true});
};

const listReports = async ({request, env}) => {
    await requireStaff(request, env);
    const handled = new URL(request.url).searchParams.get('status') === 'handled';
    const {results} = await env.DB.prepare(
        `SELECT reports.id, reports.kind, reports.reason, reports.details, reports.created_at, reports.resolved_at,
            reporter.username AS reporter,
            projects.id AS project_id, projects.title AS project_title, owner.username AS project_owner,
            target.username AS target_username,
            resolver.username AS resolved_by
        FROM reports
        JOIN users AS reporter ON reporter.id = reports.reporter_id
        LEFT JOIN projects ON projects.id = reports.project_id
        LEFT JOIN users AS owner ON owner.id = projects.owner_id
        LEFT JOIN users AS target ON target.id = reports.user_id
        LEFT JOIN users AS resolver ON resolver.id = reports.resolved_by
        WHERE (reports.resolved_at IS NOT NULL) = ?
        ORDER BY reports.created_at DESC
        LIMIT 200`
    ).bind(handled ? 1 : 0)
        .all();
    return reply({
        reports: results.map(row => ({
            id: row.id,
            kind: row.kind,
            reason: row.reason,
            details: row.details,
            created: row.created_at,
            resolved: row.resolved_at,
            resolvedBy: row.resolved_by,
            reporter: row.reporter,
            project: row.project_id ? {id: row.project_id, title: row.project_title, owner: row.project_owner} : null,
            user: row.target_username
        }))
    });
};

const resolveReport = async ({request, env, id}) => {
    const user = await requireStaff(request, env);
    const result = /^\d+$/.test(id) && await env.DB.prepare(
        'UPDATE reports SET resolved_at = ?, resolved_by = ? WHERE id = ? AND resolved_at IS NULL'
    ).bind(Date.now(), user.id, Number(id))
        .run();
    if (!result || result.meta.changes === 0) {
        throw new AccountError(404, 'no-report', 'That report was already dealt with.');
    }
    return reply({resolved: true});
};

/**
 * Answer a request to /api/reports...
 * @param {Request} request The request.
 * @param {object} env Cloudflare bindings and settings.
 * @param {string[]} path The parts of the address after /api/reports.
 * @returns {Promise<Response>} The response.
 */
const handleReportRequest = async (request, env, path) => {
    let run = null;
    if (path.length === 0 && request.method === 'GET') run = listReports;
    else if (path.length === 0 && request.method === 'POST') run = sendReport;
    else if (path.length === 2 && path[1] === 'resolve' && request.method === 'POST') run = resolveReport;
    if (!run) {
        return reply({error: 'not-found', message: 'Not found.'}, 404);
    }
    let body = {};
    if (request.method === 'POST') {
        // Only JSON is accepted. Other websites can't send that here, so they can't use someone's sign-in.
        if (!(request.headers.get('Content-Type') || '').startsWith('application/json')) {
            return reply({error: 'bad-request', message: 'Send JSON.'}, 415);
        }
        try {
            body = await request.json();
        } catch (e) {
            body = null;
        }
        if (!body || typeof body !== 'object') {
            return reply({error: 'bad-request', message: 'Send JSON.'}, 400);
        }
    }
    try {
        return await run({request, env, body, id: path[0]});
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
    handleReportRequest
};
