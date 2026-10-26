// Adds .sprite3 files to the GitHub sprite library in sprite-library/.
// Usage: node scripts/add-sprite.mjs "My Sprite.sprite3" [more.sprite3 ...] [--tags animals,fantasy]
// A sprite with the same name as one already in the library replaces it.

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import JSZip from '@turbowarp/jszip';

const libraryDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'sprite-library');
const assetsDir = path.join(libraryDir, 'assets');
const indexPath = path.join(libraryDir, 'sprites.json');

const args = process.argv.slice(2);
const tagsIndex = args.indexOf('--tags');
const tags = tagsIndex === -1 ? [] : args.splice(tagsIndex, 2)[1].split(',')
    .map(tag => tag.trim())
    .filter(Boolean);
if (args.length === 0) {
    console.error('Usage: node scripts/add-sprite.mjs "My Sprite.sprite3" [more.sprite3 ...] [--tags animals,fantasy]');
    process.exit(1);
}

fs.mkdirSync(assetsDir, {recursive: true});
const library = fs.existsSync(indexPath) ? JSON.parse(fs.readFileSync(indexPath, 'utf-8')) : [];

const copyAsset = async (zip, asset) => {
    const file = zip.file(asset.md5ext) || zip.file(`${asset.assetId}.${asset.dataFormat}`);
    if (!file) throw new Error(`Missing file for ${asset.name} (${asset.md5ext})`);
    const data = await file.async('nodebuffer');
    // Name files by their real md5 so the editor can always find them
    const assetId = crypto.createHash('md5').update(data)
        .digest('hex');
    const md5ext = `${assetId}.${asset.dataFormat}`;
    fs.writeFileSync(path.join(assetsDir, md5ext), data);
    return {...asset, assetId, md5ext};
};

for (const spritePath of args) {
    const zip = await JSZip.loadAsync(fs.readFileSync(spritePath));
    const spriteJSON = zip.file('sprite.json');
    if (!spriteJSON) throw new Error(`${spritePath} is not a .sprite3 file`);
    const sprite = JSON.parse(await spriteJSON.async('string'));

    const costumes = [];
    for (const costume of sprite.costumes) costumes.push(await copyAsset(zip, costume));
    const sounds = [];
    for (const sound of sprite.sounds) sounds.push(await copyAsset(zip, sound));

    const entry = {
        ...sprite,
        tags,
        isStage: false,
        costumes,
        sounds
    };
    const existing = library.findIndex(item => item.name === entry.name);
    if (existing === -1) {
        library.push(entry);
    } else {
        library[existing] = entry;
    }
    console.log(`${existing === -1 ? 'Added' : 'Updated'} "${entry.name}" ` +
        `(${costumes.length} costumes, ${sounds.length} sounds)`);
}

fs.writeFileSync(indexPath, `${JSON.stringify(library, null, 4)}\n`);
console.log(`Saved ${path.relative(process.cwd(), indexPath)}. Commit and push to put it on GitHub.`);
