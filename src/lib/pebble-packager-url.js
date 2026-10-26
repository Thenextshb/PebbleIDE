// The PebbleIDE Packager is deployed with the editor, in the packager/ folder of the site.
// During development it runs on its own dev server instead.
const PACKAGER_URL = process.env.NODE_ENV === 'production' ?
    new URL(`${process.env.ROOT || ''}packager/`, location.href).href :
    'http://localhost:8947/';

const PACKAGER_ORIGIN = new URL(PACKAGER_URL).origin;

export {
    PACKAGER_URL,
    PACKAGER_ORIGIN
};
