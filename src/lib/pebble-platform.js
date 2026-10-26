// Written into every project PebbleIDE saves (meta.platform), so other editors can tell where it came from.
const PEBBLEIDE_PLATFORM = {
    name: 'PebbleIDE',
    url: typeof location === 'undefined' ? '' : new URL(process.env.ROOT || './', location.href).href
};

// Projects from these platforms work in PebbleIDE as they are, so opening them shows no warning.
const COMPATIBLE_PLATFORMS = ['TurboWarp'];

// PebbleIDE's own project file extension. It's the same zip format as .sb3 inside.
const PROJECT_EXTENSION = 'pbp';

// Files that can be opened in PebbleIDE
const OPENABLE_EXTENSIONS = ['.pbp', '.sb', '.sb2', '.sb3'];

/**
 * @param {string} filename Name of a project file
 * @returns {string} The project title, or '' if it isn't a project file
 */
const getProjectTitleFromFilename = filename => {
    if (!filename) return '';
    const matches = filename.match(/^(.*)\.(pbp|sb[23]?)$/);
    if (!matches) return '';
    return matches[1].substring(0, 100); // truncate project title to max 100 chars
};

export {
    PEBBLEIDE_PLATFORM,
    COMPATIBLE_PLATFORMS,
    PROJECT_EXTENSION,
    OPENABLE_EXTENSIONS,
    getProjectTitleFromFilename
};
