// Refreshes the PenguinMod and Snail IDE extension gallery lists shown in the extension library.
// Usage: node scripts/update-extension-galleries.mjs
//
// The lists come from each gallery's GitHub repository. Extensions in
// extension-gallery-skip.json are left out because they don't work in PebbleIDE.

import {readFileSync, writeFileSync, existsSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = join(root, 'src', 'lib', 'libraries', 'pebble-gallery-extensions.json');
const skipPath = join(root, 'scripts', 'extension-gallery-skip.json');

const GALLERIES = [
    {
        gallery: 'penguinmod',
        list: 'https://raw.githubusercontent.com/PenguinMod/PenguinMod-ExtensionsGallery/main/src/lib/extensions.js',
        site: 'https://extensions.penguinmod.com'
    },
    {
        gallery: 'snailide',
        list: 'https://raw.githubusercontent.com/Snail-IDE/Snail-IDE-ExtensionsGallery/main/src/lib/extensions.js',
        site: 'https://snail-ide-extensions-gallery.vercel.app'
    }
];

// The lists are JavaScript modules holding a plain array, so read them in an empty sandbox
const parseList = source => {
    const context = vm.createContext({});
    const code = source.replace(/^\s*export\s+default\s+/m, 'globalThis.list = ');
    vm.runInContext(code, context, {timeout: 1000});
    if (!Array.isArray(context.list)) throw new Error('Gallery list is not an array');
    return JSON.parse(JSON.stringify(context.list));
};

const previous = existsSync(outputPath) ? JSON.parse(readFileSync(outputPath, 'utf-8')) : [];
const previousByURL = new Map(previous.map(item => [item.extensionURL, item]));
const skip = existsSync(skipPath) ? JSON.parse(readFileSync(skipPath, 'utf-8')) : {};

const result = [];
for (const {gallery, list, site} of GALLERIES) {
    const response = await fetch(list);
    if (!response.ok) throw new Error(`${list}: HTTP ${response.status}`);
    for (const extension of parseList(await response.text())) {
        if (!extension.code || !extension.name) continue;
        const extensionURL = `${site}/extensions/${extension.code}`;
        if (skip[extensionURL]) continue;
        const old = previousByURL.get(extensionURL);
        const description = extension.unstable && extension.unstableReason ?
            `${extension.description} (${extension.unstableReason})` :
            extension.description;
        result.push({
            gallery,
            name: extension.name,
            description,
            creator: extension.creatorAlias || extension.creator,
            extensionURL,
            iconURL: extension.banner ? `${site}/images/${extension.banner}` : null,
            docsURI: extension.documentation ? `${site}/docs/${extension.documentation}` : null,
            // Found by loading the extension; the editor works it out itself when missing
            extensionId: old ? old.extensionId : null
        });
    }
}

writeFileSync(outputPath, `${JSON.stringify(result, null, 4)}\n`);
console.log(`Wrote ${result.length} extensions to ${outputPath}`);
