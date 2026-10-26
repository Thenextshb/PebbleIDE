import log from '../log';
import {getGitHubRawURL, hasGitHub} from '../pebble-github';

// The sprite library is read from GitHub (see lib/pebble-github.js). If that doesn't work,
// the editor reads the copy of sprite-library/ that is deployed with the site.
const LIBRARY_FOLDER = 'sprite-library';

// Also list Scratch's built-in sprites and costumes after the ones from GitHub.
export const INCLUDE_SCRATCH_SPRITES = true;

// Must be absolute because assets are fetched from a worker
const DEPLOYED_LIBRARY_URL = new URL(`${process.env.ROOT || ''}${LIBRARY_FOLDER}/`, location.href).href;
const LIBRARY_URLS = hasGitHub() ?
    [getGitHubRawURL(`${LIBRARY_FOLDER}/`), DEPLOYED_LIBRARY_URL] :
    [DEPLOYED_LIBRARY_URL];

// Whichever of LIBRARY_URLS the library loaded from
let libraryURL = LIBRARY_URLS[0];

// md5ext of every costume and sound file that lives in the GitHub library
const githubAssets = new Set();

/**
 * @param {string} md5ext asset file name, eg. "0123abcd.svg"
 * @returns {string|null} URL of the file in the GitHub library, or null if it isn't one of ours
 */
export const getLibraryAssetURL = md5ext => (
    githubAssets.has(md5ext) ? `${libraryURL}assets/${md5ext}` : null
);

const loadSpritesFrom = url => fetch(`${url}sprites.json`, {cache: 'no-cache'})
    .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
    });

const loadGitHubSprites = async () => {
    for (const url of LIBRARY_URLS) {
        try {
            const sprites = await loadSpritesFrom(url);
            libraryURL = url;
            for (const sprite of sprites) {
                if (!Array.isArray(sprite.tags)) sprite.tags = [];
                for (const asset of [...(sprite.costumes || []), ...(sprite.sounds || [])]) {
                    githubAssets.add(asset.md5ext);
                }
            }
            return sprites;
        } catch (err) {
            log.warn(`Could not load sprite library from ${url}`, err);
        }
    }
    return [];
};

let githubSprites = null;

/**
 * The library is only downloaded once, then shared by the sprite and costume libraries.
 * @returns {Promise<object[]>} sprites from the GitHub library, or [] if it couldn't be loaded
 */
export const fetchGitHubSprites = () => {
    if (!githubSprites) {
        githubSprites = loadGitHubSprites();
    }
    return githubSprites;
};
