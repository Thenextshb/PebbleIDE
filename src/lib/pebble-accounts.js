// Talks to PebbleIDE's account server (server/accounts.js) and loads Cloudflare Turnstile, the robot check.

// Accounts are hidden until they're set up on Cloudflare; webpack.config.js decides
const ACCOUNTS_ENABLED = process.env.PEBBLE_ACCOUNTS === 'true';

// From the Turnstile widget in the Cloudflare dashboard (see server/SETUP.md). It isn't a secret.
const TURNSTILE_SITE_KEY = '0x4AAAAAAFnS-L0fd3DCc4DE';
// Cloudflare's test key, which always passes, for trying things out on this computer
const TURNSTILE_TEST_SITE_KEY = '1x00000000000000000000AA';

const isLocal = () => ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);

/**
 * @returns {string} The Turnstile site key to use here, or an empty string if it hasn't been set up yet.
 */
const getTurnstileSiteKey = () => (isLocal() ? TURNSTILE_TEST_SITE_KEY : TURNSTILE_SITE_KEY);

let turnstilePromise = null;
/**
 * @returns {Promise<object>} Cloudflare's turnstile object, once its script has loaded.
 */
const loadTurnstile = () => {
    if (!turnstilePromise) {
        turnstilePromise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
            script.onload = () => resolve(window.turnstile);
            script.onerror = () => {
                turnstilePromise = null;
                script.remove();
                reject(new Error('The robot check couldn\'t load. Check your internet connection and try again.'));
            };
            document.head.appendChild(script);
        });
    }
    return turnstilePromise;
};

const getSiteURL = path => new URL(path, new URL(process.env.ROOT || './', location.href)).href;
const getAPIURL = action => getSiteURL(`api/accounts/${action}`);

// Names shown for each role. Roles are given out by hand; see server/SETUP.md.
const ROLE_NAMES = {
    member: 'Member',
    developer: 'Developer',
    moderator: 'Moderator',
    admin: 'Admin'
};

/**
 * @param {string} username Whose profile.
 * @returns {string} Address of their profile page.
 */
const getProfileURL = username => getSiteURL(`profile.html?user=${encodeURIComponent(username)}`);

/**
 * @param {string} username Whose picture.
 * @param {?number} version Their avatarVersion; a new picture gets a new version.
 * @returns {?string} Address of their profile picture, or null if they don't have one.
 */
const getAvatarURL = (username, version) => (version ?
    `${getAPIURL('avatar')}?username=${encodeURIComponent(username)}&v=${version}` :
    null);

/**
 * Ask PebbleIDE's server something.
 * @param {string} url The address, under api/.
 * @param {*} body JSON data, a picture (a Blob), an upload (FormData), or nothing to just get something.
 * @returns {Promise<object>} The answer.
 */
const apiRequest = async (url, body) => {
    let options;
    if (!body) {
        options = {credentials: 'same-origin', cache: 'no-store'};
    } else if (typeof FormData === 'function' && body instanceof FormData) {
        // The server only takes uploads with this header, which other websites can't send
        options = {method: 'POST', headers: {'X-Requested-With': 'PebbleIDE'}, body, credentials: 'same-origin'};
    } else if (body instanceof Blob) {
        options = {method: 'POST', headers: {'Content-Type': body.type}, body, credentials: 'same-origin'};
    } else {
        options = {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(body),
            credentials: 'same-origin'
        };
    }
    let response;
    try {
        response = await fetch(url, options);
    } catch (e) {
        throw new Error('Couldn\'t reach PebbleIDE. Check your internet connection and try again.');
    }
    let data = null;
    try {
        data = await response.json();
    } catch (e) {
        // Not an answer from the account server
    }
    if (!response.ok || !data) {
        const error = new Error((data && data.message) || 'Something went wrong. Please try again.');
        error.code = data && data.error;
        error.status = response.status;
        throw error;
    }
    return data;
};

const request = (action, body) => apiRequest(getAPIURL(action), body);

// undefined until it's known; null when signed out
let currentUser;
// False when accounts are turned off, or this copy of the site has no account server
let available = ACCOUNTS_ENABLED;
const listeners = new Set();

// Tells other open PebbleIDE tabs when someone signs in or out, or changes their profile
const channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel('pebble-accounts') : null;

const updateUser = user => {
    currentUser = user;
    listeners.forEach(listener => listener(user));
    return user;
};

const setUser = user => {
    if (channel) channel.postMessage({user});
    return updateUser(user);
};

if (channel) {
    channel.onmessage = e => updateUser(e.data.user);
}

/**
 * @param {function(?object)} listener Called with the signed-in user (or null) whenever it changes.
 * @returns {function} Stops listening.
 */
const onUserChange = listener => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};

const getUser = () => currentUser;
const accountsAvailable = () => available;

let loading = null;
/**
 * Find out who's signed in, once per page.
 * @returns {Promise<?object>} The signed-in user, or null.
 */
const loadUser = () => {
    if (!ACCOUNTS_ENABLED) return Promise.resolve(null);
    if (!loading) {
        loading = request('me')
            .then(data => setUser(data.user))
            .catch(error => {
                if (error.status === 404 || !error.status) available = false;
                return setUser(null);
            });
    }
    return loading;
};

const signUp = ({username, email, password, turnstile}) => request('sign-up', {username, email, password, turnstile})
    .then(data => setUser(data.user));

const signIn = ({username, password, turnstile}) => request('sign-in', {username, password, turnstile})
    .then(data => setUser(data.user));

const signOut = () => request('sign-out', {})
    .then(() => setUser(null));

const forgotPassword = ({email, turnstile}) => request('forgot-password', {email, turnstile});

const resetPassword = ({token, password}) => request('reset-password', {token, password})
    .then(data => setUser(data.user));

const refreshUser = () => request('me')
    .then(data => setUser(data.user));

const verifyEmail = token => request('verify-email', {token})
    .then(async data => {
        // Update the signed-in user if it's the same account
        if (currentUser && currentUser.username === data.username) await refreshUser();
        return data;
    });

const sendVerificationEmail = () => request('send-verification', {});

const getProfile = username => request(`profile?username=${encodeURIComponent(username)}`)
    .then(data => data.profile);

const updateProfile = ({bio}) => request('update-profile', {bio})
    .then(data => setUser(data.user));

const setAvatar = picture => request('set-avatar', picture)
    .then(data => setUser(data.user));

const removeAvatar = () => request('remove-avatar', {})
    .then(data => setUser(data.user));

/**
 * @param {string} username Who to follow.
 * @returns {Promise<{followers: number, following: number, youFollow: boolean}>} Their follower counts now.
 */
const followUser = username => request('follow', {username});

const unfollowUser = username => request('unfollow', {username});

/**
 * @returns {?{type: string, token: string}} The kind of link and its secret if the page was opened from a
 * "reset your password" or "verify your email" email.
 */
const getEmailLinkFromURL = () => {
    if (!ACCOUNTS_ENABLED) return null;
    const match = location.hash.match(/^#(reset-password|verify-email)=([\w-]+)$/);
    return match ? {type: match[1], token: match[2]} : null;
};

export {
    ACCOUNTS_ENABLED,
    ROLE_NAMES,
    accountsAvailable,
    apiRequest,
    getSiteURL,
    followUser,
    forgotPassword,
    getAvatarURL,
    getEmailLinkFromURL,
    getProfile,
    getProfileURL,
    getTurnstileSiteKey,
    getUser,
    loadTurnstile,
    loadUser,
    onUserChange,
    refreshUser,
    removeAvatar,
    resetPassword,
    sendVerificationEmail,
    setAvatar,
    signIn,
    signOut,
    signUp,
    unfollowUser,
    updateProfile,
    verifyEmail
};
