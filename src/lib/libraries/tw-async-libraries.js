import {fetchGitHubSprites, INCLUDE_SCRATCH_SPRITES} from './pebble-github-library';

const asyncLibrary = callback => {
    let data = null;
    return () => {
        if (data) return data;
        return callback()
            .then(mod => (data = mod.default));
    };
};

export const getBackdropLibrary = asyncLibrary(
    () => import(/* webpackChunkName: "library-backdrops" */ './backdrops.json')
);
// Costumes of the sprites in PebbleIDE's GitHub library come first, then Scratch's built-in costumes.
export const getCostumeLibrary = asyncLibrary(
    () => Promise.all([
        fetchGitHubSprites(),
        INCLUDE_SCRATCH_SPRITES ?
            import(/* webpackChunkName: "library-costumes" */ './costumes.json').then(mod => mod.default) :
            []
    ]).then(([githubSprites, scratchCostumes]) => ({
        default: githubSprites
            .flatMap(sprite => (sprite.costumes || []).map(costume => ({
                name: costume.name,
                tags: sprite.tags,
                assetId: costume.assetId,
                bitmapResolution: costume.bitmapResolution || 1,
                dataFormat: costume.dataFormat,
                md5ext: costume.md5ext,
                rotationCenterX: costume.rotationCenterX,
                rotationCenterY: costume.rotationCenterY
            })))
            .concat(scratchCostumes)
    }))
);
export const getSoundLibrary = asyncLibrary(
    () => import(/* webpackChunkName: "library-sounds" */ './sounds.json')
);
// Sprites from PebbleIDE's GitHub library come first, then Scratch's built-in sprites.
// A GitHub sprite with the same name as a Scratch one replaces it.
export const getSpriteLibrary = asyncLibrary(
    () => Promise.all([
        fetchGitHubSprites(),
        INCLUDE_SCRATCH_SPRITES ?
            import(/* webpackChunkName: "library-sprites" */ './sprites.json').then(mod => mod.default) :
            []
    ]).then(([githubSprites, scratchSprites]) => {
        const githubNames = new Set(githubSprites.map(sprite => sprite.name));
        return {
            default: githubSprites.concat(scratchSprites.filter(sprite => !githubNames.has(sprite.name)))
        };
    })
);
