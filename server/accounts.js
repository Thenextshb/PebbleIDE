/**
 * PebbleIDE accounts: create an account, sign in and out, reset a forgotten password, verify an email,
 * profiles (bio, profile picture and role), and following other users.
 * This runs on Cloudflare in PebbleIDE's Worker (server/worker.js) and keeps accounts
 * in a D1 database (env.DB, set up with the files in server/migrations).
 *
 * Settings, see server/SETUP.md:
 *   TURNSTILE_SECRET  Secret key of the Turnstile widget, Cloudflare's robot check
 *   RESEND_API_KEY    Key for sending emails with Resend. Without it, emails are only written to the log.
 *   EMAIL_FROM        Who emails come from, like "PebbleIDE <accounts@pebbleide.com>"
 *   SITE_URL          Address of the site for links in emails. Defaults to the address the request came to.
 */

const SESSION_COOKIE = 'pebble_session';
const SESSION_DAYS = 30;
const RESET_LINK_MINUTES = 60;
const VERIFY_LINK_HOURS = 24;
// How long to wait before sending another "verify your email" email
const VERIFY_RESEND_SECONDS = 60;
// The most Cloudflare allows
const PASSWORD_ITERATIONS = 100000;

const USERNAME_PATTERN = /^[A-Za-z0-9_-]{3,20}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 200;
const MAX_BIO_LENGTH = 500;
// Pictures are shrunk to 256x256 before they're sent, so they're much smaller than this
const MAX_AVATAR_BYTES = 256 * 1024;
const AVATAR_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

const USER_COLUMNS = 'users.id, users.username, users.email, users.email_verified, users.role, users.bio, ' +
    'users.avatar_version, users.created_at';

const DAY = 24 * 60 * 60 * 1000;
const encoder = new TextEncoder();

class AccountError extends Error {
    constructor (status, code, message) {
        super(message);
        this.status = status;
        this.code = code;
    }
}

const reply = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), {
    status,
    headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        ...headers
    }
});

const toHex = bytes => Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
const fromHex = hex => new Uint8Array((hex.match(/../g) || []).map(pair => parseInt(pair, 16)));

const makeSecret = () => {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    return btoa(String.fromCharCode(...bytes))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/[=]+$/, '');
};

const sha256 = async text => toHex(await crypto.subtle.digest('SHA-256', encoder.encode(text)));

const derivePasswordHash = async (password, salt, iterations) => {
    const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
    return crypto.subtle.deriveBits({name: 'PBKDF2', hash: 'SHA-256', salt, iterations}, key, 256);
};

// The number of iterations is stored with the hash so it can be changed later
const hashPassword = async password => {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const hash = await derivePasswordHash(password, salt, PASSWORD_ITERATIONS);
    return `pbkdf2$${PASSWORD_ITERATIONS}$${toHex(salt)}$${toHex(hash)}`;
};

const isRightPassword = async (password, stored) => {
    const [kind, iterations, salt, expected] = stored.split('$');
    if (kind !== 'pbkdf2') return false;
    const actual = toHex(await derivePasswordHash(password, fromHex(salt), Number(iterations)));
    // Look at every character so how long this takes doesn't give anything away
    let difference = actual.length ^ expected.length;
    for (let i = 0; i < actual.length; i++) {
        difference |= actual.charCodeAt(i) ^ expected.charCodeAt(i);
    }
    return difference === 0;
};

const text = value => (typeof value === 'string' ? value : '');

const checkPasswordRules = password => {
    if (password.length < MIN_PASSWORD_LENGTH) {
        throw new AccountError(400, 'password-too-short',
            `Your password needs to be at least ${MIN_PASSWORD_LENGTH} characters long.`);
    }
    if (password.length > MAX_PASSWORD_LENGTH) {
        throw new AccountError(400, 'password-too-long',
            `Your password can't be longer than ${MAX_PASSWORD_LENGTH} characters.`);
    }
};

const checkRobotCheck = async (request, env, token) => {
    if (!env.TURNSTILE_SECRET) {
        throw new Error('TURNSTILE_SECRET is not set, so the robot check can\'t be checked');
    }
    if (!text(token)) {
        throw new AccountError(400, 'robot-check', 'Please finish the robot check first.');
    }
    const form = new FormData();
    form.append('secret', env.TURNSTILE_SECRET);
    form.append('response', token);
    const ip = request.headers.get('CF-Connecting-IP');
    if (ip) form.append('remoteip', ip);
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        body: form
    });
    const result = await response.json();
    if (!result.success) {
        throw new AccountError(400, 'robot-check', 'The robot check didn\'t work. Please try it again.');
    }
};

const sendEmail = async (env, {to, subject, body}) => {
    if (!env.RESEND_API_KEY) {
        // eslint-disable-next-line no-console
        console.log(`Email to ${to} wasn't sent because RESEND_API_KEY isn't set:\n${subject}\n\n${body}`);
        return;
    }
    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${env.RESEND_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            from: env.EMAIL_FROM || 'PebbleIDE <accounts@pebbleide.com>',
            to: [to],
            subject,
            text: body
        })
    });
    if (!response.ok) {
        throw new Error(`Resend couldn't send the email: ${response.status} ${await response.text()}`);
    }
};

const getSessionSecret = request => {
    const cookies = request.headers.get('Cookie') || '';
    for (const cookie of cookies.split(';')) {
        const [name, ...value] = cookie.trim().split('=');
        if (name === SESSION_COOKIE) return value.join('=');
    }
    return null;
};

const sessionCookie = (secret, maxAge) =>
    `${SESSION_COOKIE}=${secret}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;

// Returns the cookie that signs this browser in
const startSession = async (env, userId) => {
    const secret = makeSecret();
    const now = Date.now();
    await env.DB.batch([
        env.DB.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(now),
        env.DB.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
            .bind(await sha256(secret), userId, now + (SESSION_DAYS * DAY))
    ]);
    return sessionCookie(secret, SESSION_DAYS * 24 * 60 * 60);
};

const getSignedInUser = async (request, env) => {
    const secret = getSessionSecret(request);
    if (!secret) return null;
    return env.DB.prepare(
        `SELECT ${USER_COLUMNS} FROM sessions
        JOIN users ON users.id = sessions.user_id
        WHERE sessions.token_hash = ? AND sessions.expires_at > ?`
    ).bind(await sha256(secret), Date.now())
        .first();
};

const requireSignedInUser = async (request, env) => {
    const user = await getSignedInUser(request, env);
    if (!user) {
        throw new AccountError(401, 'signed-out', 'You need to sign in first.');
    }
    return user;
};

// Changing your profile (and, later, sharing projects) needs a verified email
const requireVerifiedUser = async (request, env) => {
    const user = await requireSignedInUser(request, env);
    if (!user.email_verified) {
        throw new AccountError(403, 'verify-email',
            'Verify your email first. Open the link in the email we sent you, or ask for a new one on your profile.');
    }
    return user;
};

// What you can see about your own account
const ownUser = user => ({
    username: user.username,
    email: user.email,
    emailVerified: Boolean(user.email_verified),
    role: user.role,
    bio: user.bio,
    avatarVersion: user.avatar_version,
    joined: user.created_at
});

// What anyone can see on a profile
const publicProfile = user => ({
    username: user.username,
    role: user.role,
    bio: user.bio,
    avatarVersion: user.avatar_version,
    joined: user.created_at
});

const getSiteURL = (request, env) => (env.SITE_URL || new URL(request.url).origin).replace(/\/$/, '');

const sendVerificationEmail = async (request, env, user) => {
    const secret = makeSecret();
    const now = Date.now();
    await env.DB.batch([
        env.DB.prepare('DELETE FROM email_verifications WHERE expires_at < ?').bind(now),
        env.DB.prepare('INSERT INTO email_verifications (token_hash, user_id, expires_at, sent_at) VALUES (?, ?, ?, ?)')
            .bind(await sha256(secret), user.id, now + (VERIFY_LINK_HOURS * 60 * 60 * 1000), now)
    ]);
    await sendEmail(env, {
        to: user.email,
        subject: 'Verify your PebbleIDE email',
        body: [
            `Hi ${user.username},`,
            '',
            'Welcome to PebbleIDE! To verify your email, open this link:',
            '',
            `${getSiteURL(request, env)}/#verify-email=${secret}`,
            '',
            `The link works for ${VERIFY_LINK_HOURS} hours. ` +
                'Once your email is verified, you can change your bio and profile picture.',
            '',
            'If you didn\'t make a PebbleIDE account, you can ignore this email.'
        ].join('\n')
    });
};

const me = async ({request, env}) => {
    const user = await getSignedInUser(request, env);
    return reply({user: user ? ownUser(user) : null});
};

const signUp = async ({request, env, body}) => {
    const username = text(body.username).trim();
    const email = text(body.email).trim()
        .toLowerCase();
    const password = text(body.password);
    if (!USERNAME_PATTERN.test(username)) {
        throw new AccountError(400, 'bad-username',
            'Usernames are 3 to 20 letters, numbers, - or _, with no spaces.');
    }
    if (email.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email)) {
        throw new AccountError(400, 'bad-email', 'That doesn\'t look like an email address.');
    }
    checkPasswordRules(password);
    await checkRobotCheck(request, env, body.turnstile);

    const taken = await env.DB.prepare('SELECT username, email FROM users WHERE username = ? OR email = ?')
        .bind(username, email)
        .first();
    if (taken) {
        if (taken.username.toLowerCase() === username.toLowerCase()) {
            throw new AccountError(409, 'username-taken', 'Someone already has that username. Try another one.');
        }
        throw new AccountError(409, 'email-taken',
            'There\'s already an account with that email. Try signing in, or reset your password.');
    }

    let user;
    try {
        user = await env.DB.prepare(
            `INSERT INTO users (username, email, password, created_at) VALUES (?, ?, ?, ?)
            RETURNING ${USER_COLUMNS.replace(/users\./g, '')}`
        ).bind(username, email, await hashPassword(password), Date.now())
            .first();
    } catch (e) {
        // Someone else took the name at the same moment
        if (String(e.message).includes('UNIQUE')) {
            throw new AccountError(409, 'username-taken', 'Someone already has that username. Try another one.');
        }
        throw e;
    }
    try {
        await sendVerificationEmail(request, env, user);
    } catch (e) {
        // The account still works; they can ask for the email again from their profile
        // eslint-disable-next-line no-console
        console.error(e);
    }
    return reply({user: ownUser(user)}, 200, {'Set-Cookie': await startSession(env, user.id)});
};

const signIn = async ({request, env, body}) => {
    // Either one works here
    const usernameOrEmail = text(body.username).trim();
    const password = text(body.password);
    await checkRobotCheck(request, env, body.turnstile);

    const user = usernameOrEmail && await env.DB.prepare(
        `SELECT ${USER_COLUMNS}, users.password FROM users WHERE username = ? OR email = ?`
    ).bind(usernameOrEmail, usernameOrEmail.toLowerCase())
        .first();
    if (!user || !await isRightPassword(password, user.password)) {
        throw new AccountError(401, 'wrong-sign-in', 'That username or password isn\'t right.');
    }
    return reply({user: ownUser(user)}, 200, {'Set-Cookie': await startSession(env, user.id)});
};

const signOut = async ({request, env}) => {
    const secret = getSessionSecret(request);
    if (secret) {
        await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?')
            .bind(await sha256(secret))
            .run();
    }
    return reply({user: null}, 200, {'Set-Cookie': sessionCookie('', 0)});
};

const forgotPassword = async ({request, env, body}) => {
    const email = text(body.email).trim()
        .toLowerCase();
    await checkRobotCheck(request, env, body.turnstile);

    const user = email && await env.DB.prepare('SELECT id, username, email FROM users WHERE email = ?')
        .bind(email)
        .first();
    // The answer is the same whether or not there's an account, so this can't be used to find out who has one
    if (user) {
        const secret = makeSecret();
        await env.DB.batch([
            env.DB.prepare('DELETE FROM password_resets WHERE user_id = ? OR expires_at < ?').bind(user.id, Date.now()),
            env.DB.prepare('INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
                .bind(await sha256(secret), user.id, Date.now() + (RESET_LINK_MINUTES * 60 * 1000))
        ]);
        await sendEmail(env, {
            to: user.email,
            subject: 'Reset your PebbleIDE password',
            body: [
                `Hi ${user.username},`,
                '',
                'Someone asked to reset the password for your PebbleIDE account. ' +
                    'To pick a new password, open this link:',
                '',
                `${getSiteURL(request, env)}/#reset-password=${secret}`,
                '',
                `The link works for ${RESET_LINK_MINUTES} minutes. ` +
                    'If you didn\'t ask for this, you can ignore this email and your password will stay the same.'
            ].join('\n')
        });
    }
    return reply({sent: true});
};

const resetPassword = async ({env, body}) => {
    const password = text(body.password);
    checkPasswordRules(password);
    const reset = text(body.token) && await env.DB.prepare(
        `SELECT ${USER_COLUMNS} FROM password_resets
        JOIN users ON users.id = password_resets.user_id
        WHERE password_resets.token_hash = ? AND password_resets.expires_at > ?`
    ).bind(await sha256(text(body.token)), Date.now())
        .first();
    if (!reset) {
        throw new AccountError(400, 'bad-reset-link',
            'This reset link has expired or was already used. Ask for a new one with "Forgot your password?".');
    }
    // The new password signs out every other browser. Getting the email also proves it's theirs.
    await env.DB.batch([
        env.DB.prepare('UPDATE users SET password = ?, email_verified = 1 WHERE id = ?')
            .bind(await hashPassword(password), reset.id),
        env.DB.prepare('DELETE FROM password_resets WHERE user_id = ?').bind(reset.id),
        env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(reset.id)
    ]);
    return reply({user: ownUser({...reset, email_verified: 1})}, 200, {
        'Set-Cookie': await startSession(env, reset.id)
    });
};

const sendVerification = async ({request, env}) => {
    const user = await requireSignedInUser(request, env);
    if (user.email_verified) {
        return reply({user: ownUser(user)});
    }
    const last = await env.DB.prepare('SELECT MAX(sent_at) AS sent_at FROM email_verifications WHERE user_id = ?')
        .bind(user.id)
        .first();
    if (last && last.sent_at && Date.now() - last.sent_at < VERIFY_RESEND_SECONDS * 1000) {
        throw new AccountError(429, 'too-soon', 'We just sent you one. Wait a minute before asking for another.');
    }
    await sendVerificationEmail(request, env, user);
    return reply({sent: true, user: ownUser(user)});
};

const verifyEmail = async ({env, body}) => {
    const verification = text(body.token) && await env.DB.prepare(
        `SELECT users.id, users.username FROM email_verifications
        JOIN users ON users.id = email_verifications.user_id
        WHERE email_verifications.token_hash = ? AND email_verifications.expires_at > ?`
    ).bind(await sha256(text(body.token)), Date.now())
        .first();
    if (!verification) {
        throw new AccountError(400, 'bad-verify-link',
            'This link has expired or was already used. Sign in and ask for a new one on your profile.');
    }
    await env.DB.batch([
        env.DB.prepare('UPDATE users SET email_verified = 1 WHERE id = ?').bind(verification.id),
        env.DB.prepare('DELETE FROM email_verifications WHERE user_id = ?').bind(verification.id)
    ]);
    return reply({verified: true, username: verification.username});
};

const findUser = async (env, username) => {
    const user = text(username) && await env.DB.prepare(`SELECT ${USER_COLUMNS} FROM users WHERE username = ?`)
        .bind(text(username))
        .first();
    if (!user) {
        throw new AccountError(404, 'no-user', 'There\'s no PebbleIDE user with that name.');
    }
    return user;
};

// Follower counts, and whether the person looking follows them
const getFollowInfo = async (env, user, viewer) => {
    const counts = await env.DB.prepare(
        `SELECT
            (SELECT COUNT(*) FROM follows WHERE followed_id = ?1) AS followers,
            (SELECT COUNT(*) FROM follows WHERE follower_id = ?1) AS following,
            (SELECT COUNT(*) FROM follows WHERE follower_id = ?2 AND followed_id = ?1) AS you_follow`
    ).bind(user.id, viewer ? viewer.id : 0)
        .first();
    return {
        followers: counts.followers,
        following: counts.following,
        youFollow: Boolean(counts.you_follow)
    };
};

const getProfile = async ({request, env}) => {
    const user = await findUser(env, new URL(request.url).searchParams.get('username'));
    const viewer = await getSignedInUser(request, env);
    return reply({
        profile: {
            ...publicProfile(user),
            ...await getFollowInfo(env, user, viewer)
        }
    });
};

const follow = async ({request, env, body}) => {
    const viewer = await requireSignedInUser(request, env);
    const user = await findUser(env, body.username);
    if (user.id === viewer.id) {
        throw new AccountError(400, 'follow-yourself', 'You can\'t follow yourself.');
    }
    await env.DB.prepare('INSERT OR IGNORE INTO follows (follower_id, followed_id, created_at) VALUES (?, ?, ?)')
        .bind(viewer.id, user.id, Date.now())
        .run();
    return reply(await getFollowInfo(env, user, viewer));
};

const unfollow = async ({request, env, body}) => {
    const viewer = await requireSignedInUser(request, env);
    const user = await findUser(env, body.username);
    await env.DB.prepare('DELETE FROM follows WHERE follower_id = ? AND followed_id = ?')
        .bind(viewer.id, user.id)
        .run();
    return reply(await getFollowInfo(env, user, viewer));
};

const updateProfile = async ({request, env, body}) => {
    const user = await requireVerifiedUser(request, env);
    const bio = text(body.bio).replace(/\r\n?/g, '\n')
        .trim();
    if (bio.length > MAX_BIO_LENGTH) {
        throw new AccountError(400, 'bio-too-long', `Your bio can't be longer than ${MAX_BIO_LENGTH} characters.`);
    }
    await env.DB.prepare('UPDATE users SET bio = ? WHERE id = ?')
        .bind(bio, user.id)
        .run();
    return reply({user: ownUser({...user, bio})});
};

// Check the file really is the kind of picture it says it is
const getImageType = bytes => {
    const ascii = (start, end) => String.fromCharCode(...bytes.slice(start, end));
    if (bytes[0] === 0x89 && ascii(1, 4) === 'PNG') return 'image/png';
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
    if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp';
    return null;
};

const setAvatar = async ({request, env, body}) => {
    const user = await requireVerifiedUser(request, env);
    const bytes = new Uint8Array(body);
    if (bytes.length > MAX_AVATAR_BYTES) {
        throw new AccountError(413, 'picture-too-big', 'That picture is too big.');
    }
    const type = getImageType(bytes);
    if (!type) {
        throw new AccountError(400, 'bad-picture', 'Profile pictures have to be PNG, JPEG or WebP images.');
    }
    const version = Date.now();
    await env.DB.batch([
        env.DB.prepare(
            `INSERT INTO avatars (user_id, image, type) VALUES (?, ?, ?)
            ON CONFLICT (user_id) DO UPDATE SET image = excluded.image, type = excluded.type`
        ).bind(user.id, bytes.buffer, type),
        env.DB.prepare('UPDATE users SET avatar_version = ? WHERE id = ?').bind(version, user.id)
    ]);
    return reply({user: ownUser({...user, avatar_version: version})});
};

const removeAvatar = async ({request, env}) => {
    const user = await requireSignedInUser(request, env);
    await env.DB.batch([
        env.DB.prepare('DELETE FROM avatars WHERE user_id = ?').bind(user.id),
        env.DB.prepare('UPDATE users SET avatar_version = NULL WHERE id = ?').bind(user.id)
    ]);
    return reply({user: ownUser({...user, avatar_version: null})});
};

const getAvatar = async ({request, env}) => {
    const username = new URL(request.url).searchParams.get('username') || '';
    const avatar = username && await env.DB.prepare(
        `SELECT avatars.image, avatars.type FROM avatars
        JOIN users ON users.id = avatars.user_id
        WHERE users.username = ?`
    ).bind(username)
        .first();
    if (!avatar) {
        return reply({error: 'no-picture', message: 'This user has no profile picture.'}, 404);
    }
    return new Response(new Uint8Array(avatar.image), {
        headers: {
            'Content-Type': avatar.type,
            // Links to pictures include the version, so a new picture gets a new link
            'Cache-Control': 'public, max-age=86400',
            'X-Content-Type-Options': 'nosniff'
        }
    });
};

const ACTIONS = {
    'me': {method: 'GET', run: me},
    'profile': {method: 'GET', run: getProfile},
    'avatar': {method: 'GET', run: getAvatar},
    'sign-up': {method: 'POST', run: signUp},
    'sign-in': {method: 'POST', run: signIn},
    'sign-out': {method: 'POST', run: signOut},
    'forgot-password': {method: 'POST', run: forgotPassword},
    'reset-password': {method: 'POST', run: resetPassword},
    'send-verification': {method: 'POST', run: sendVerification},
    'verify-email': {method: 'POST', run: verifyEmail},
    'update-profile': {method: 'POST', run: updateProfile},
    'set-avatar': {method: 'POST', body: 'image', run: setAvatar},
    'remove-avatar': {method: 'POST', run: removeAvatar},
    'follow': {method: 'POST', run: follow},
    'unfollow': {method: 'POST', run: unfollow}
};

/**
 * Answer a request to /api/accounts/<action>.
 * @param {Request} request The request.
 * @param {object} env Cloudflare bindings and settings.
 * @param {string} action What to do, like "sign-in".
 * @returns {Promise<Response>} The response.
 */
const handleAccountRequest = async (request, env, action) => {
    const handler = Object.prototype.hasOwnProperty.call(ACTIONS, action) ? ACTIONS[action] : null;
    if (!handler) {
        return reply({error: 'not-found', message: 'Not found.'}, 404);
    }
    if (request.method !== handler.method) {
        return reply({error: 'wrong-method', message: `Use ${handler.method}.`}, 405, {Allow: handler.method});
    }
    let body = {};
    const contentType = request.headers.get('Content-Type') || '';
    if (handler.body === 'image') {
        // Like JSON, other websites can't send these here without permission
        if (!AVATAR_TYPES.includes(contentType)) {
            return reply({error: 'bad-picture', message: 'Profile pictures have to be PNG, JPEG or WebP images.'}, 415);
        }
        if (Number(request.headers.get('Content-Length')) > MAX_AVATAR_BYTES) {
            return reply({error: 'picture-too-big', message: 'That picture is too big.'}, 413);
        }
        body = await request.arrayBuffer();
    } else if (handler.method === 'POST') {
        // Only JSON is accepted. Other websites can't send that here, so they can't use someone's sign-in.
        if (!contentType.startsWith('application/json')) {
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
        return await handler.run({request, env, body});
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
    AccountError,
    getImageType,
    getSignedInUser,
    handleAccountRequest,
    reply,
    requireSignedInUser,
    requireVerifiedUser,
    sha256,
    text
};
