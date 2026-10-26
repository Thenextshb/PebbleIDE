# PebbleIDE sprite library

The editor's "Choose a Sprite" menu loads `sprites.json` and the files in `assets/` from this folder on GitHub.
Set your GitHub username in `src/lib/pebble-github.js` to turn that on.

To add a sprite:

1. Make the sprite in PebbleIDE, right-click it and choose **export** to save a `.sprite3` file.
2. Run `node scripts/add-sprite.mjs "path/to/Sprite.sprite3" --tags animals,fantasy`
3. Commit and push. The sprite shows up in the editor next time it's opened.

To remove a sprite, delete its entry from `sprites.json` (and its files from `assets/` if nothing else uses them).
