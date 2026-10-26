// Talks to PebbleIDE's project server (server/projects.js), and keeps track of the shared project that's
// open in the editor and the thumbnail picked for it.

import {ACCOUNTS_ENABLED, apiRequest, getSiteURL} from './pebble-accounts';
import {resizeImage} from './pebble-images';

const THUMBNAIL_WIDTH = 480;
const THUMBNAIL_HEIGHT = 360;

const PROJECTS_ENABLED = ACCOUNTS_ENABLED;

const getAPIURL = path => getSiteURL(`api/projects${path}`);

const getProjectPageURL = id => getSiteURL(`project.html?id=${id}`);
const getEditorURL = id => getSiteURL(`editor.html#${id}`);
// The player only runs the addons listed here: the pause button
const getEmbedURL = id => getSiteURL(`embed.html?addons=pause#${id}`);
const getProjectFileURL = id => getAPIURL(`/${id}/file`);

/**
 * @param {number} id The project.
 * @param {?number} version Its thumbnailVersion; a new thumbnail gets a new version.
 * @returns {?string} Address of its thumbnail, or null if it doesn't have one.
 */
const getThumbnailURL = (id, version) => (version ? `${getAPIURL(`/${id}/thumbnail`)}?v=${version}` : null);

/**
 * @param {string} list "featured", "wanted", "recent", "search", "user" or "saved".
 * @param {object} [options] Search words (q) or whose projects (user).
 * @returns {Promise<object[]>} Projects.
 */
const listProjects = (list, options = {}) => {
    const params = new URLSearchParams({list, ...options});
    return apiRequest(`${getAPIURL('')}?${params}`).then(data => data.projects);
};

const getProject = id => apiRequest(getAPIURL(`/${id}`)).then(data => data.project);

const makeUpload = ({title, description, project, thumbnail}) => {
    const form = new FormData();
    form.append('title', title);
    form.append('description', description);
    if (project) form.append('project', project, 'project.pbp');
    if (thumbnail) form.append('thumbnail', thumbnail, 'thumbnail');
    return form;
};

/**
 * Share a project.
 * @param {object} upload The title, description, project file and thumbnail (optional).
 * @returns {Promise<object>} The shared project.
 */
const shareProject = upload => apiRequest(getAPIURL(''), makeUpload(upload)).then(data => data.project);

const updateProject = (id, upload) => apiRequest(getAPIURL(`/${id}/update`), makeUpload(upload))
    .then(data => data.project);

const projectAction = (id, action, body = {}) => apiRequest(getAPIURL(`/${id}/${action}`), body);
const setUpvoted = (id, on) => projectAction(id, on ? 'upvote' : 'remove-upvote').then(data => data.project);
const setSaved = (id, on) => projectAction(id, on ? 'save' : 'unsave').then(data => data.project);

// A random ID this browser keeps, so each device counts as one view
const DEVICE_KEY = 'pebble:deviceId';
const getDeviceId = () => {
    try {
        let device = localStorage.getItem(DEVICE_KEY);
        if (!device) {
            device = Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0'))
                .join('');
            localStorage.setItem(DEVICE_KEY, device);
        }
        return device;
    } catch (e) {
        return null;
    }
};

const countView = id => projectAction(id, 'view', {device: getDeviceId()}).then(data => data.views);
const deleteProject = id => projectAction(id, 'delete');

/**
 * @param {Blob} file A picture.
 * @returns {Promise<Blob>} It as a 480x360 thumbnail.
 */
const makeThumbnail = file => resizeImage(file, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT);

/**
 * @param {VirtualMachine} vm The VM.
 * @returns {Promise<Blob>} A thumbnail of what's on the stage right now.
 */
const makeStageThumbnail = vm => new Promise(resolve => {
    vm.renderer.requestSnapshot(resolve);
    // Draw a frame in case the project isn't running
    vm.renderer.draw();
}).then(dataURL => makeThumbnail(dataURL));

// A small store with listeners, for things the editor's buttons and pop-ups share
const makeShared = () => {
    let value = null;
    const listeners = new Set();
    return {
        get: () => value,
        set: newValue => {
            value = newValue;
            listeners.forEach(listener => listener(value));
        },
        listen: listener => {
            listeners.add(listener);
            return () => listeners.delete(listener);
        }
    };
};

// The shared project that's open in the editor, if it was opened from the site
const openProject = makeShared();
// The thumbnail picked with "Set thumbnail", used the next time the project is shared
const chosenThumbnail = makeShared();

export {
    PROJECTS_ENABLED,
    chosenThumbnail,
    countView,
    deleteProject,
    getEditorURL,
    getEmbedURL,
    getProject,
    getProjectFileURL,
    getProjectPageURL,
    getThumbnailURL,
    listProjects,
    makeStageThumbnail,
    makeThumbnail,
    openProject,
    setSaved,
    setUpvoted,
    shareProject,
    updateProject
};
