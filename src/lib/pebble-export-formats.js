import JSZip from '@turbowarp/jszip';
import {PROJECT_EXTENSION} from './pebble-platform';

// Extensions that Scratch itself has. Projects using any others won't load on Scratch.
const SCRATCH_EXTENSIONS = [
    'pen',
    'wedo2',
    'music',
    'microbit',
    'text2speech',
    'translate',
    'videoSensing',
    'ev3',
    'makeymakey',
    'boost',
    'gdxfor'
];

/**
 * Every format changes only project.json's metadata; the blocks and assets are the same.
 * PenguinMod and Snail IDE recognise their own files by these platform values.
 */
const FORMATS = [
    {
        id: 'pebbleide',
        extension: PROJECT_EXTENSION,
        // Already saved with PebbleIDE's platform, so nothing to change
        transform: null
    },
    {
        id: 'penguinmod',
        extension: 'pmp',
        transform: project => {
            project.meta.platform = {
                name: 'PenguinMod',
                url: 'https://penguinmod.com/',
                version: 'stable'
            };
            // PebbleIDE's blocks are TurboWarp's. PenguinMod only converts TurboWarp-style custom
            // reporter blocks to its own format when it knows the project came from TurboWarp.
            project.meta.origin = 'TurboWarp';
        }
    },
    {
        id: 'snailide',
        extension: 'snail',
        transform: project => {
            project.meta.platform = {
                name: 'snail-ide',
                url: 'https://snail-ide.com/',
                version: 'stable'
            };
        }
    },
    {
        id: 'scratch3',
        extension: 'sb3',
        transform: project => {
            delete project.meta.platform;
            delete project.meta.origin;
        }
    }
];

const getFormat = id => FORMATS.find(format => format.id === id) || FORMATS[0];

/**
 * @param {VirtualMachine} vm The VM with the project to save
 * @param {string} formatId One of the FORMATS ids
 * @returns {Promise<Blob>} The project file in that format
 */
const exportProject = async (vm, formatId) => {
    const format = getFormat(formatId);
    const sb3 = await vm.saveProjectSb3();
    if (!format.transform) {
        return sb3;
    }
    const zip = await JSZip.loadAsync(sb3);
    const project = JSON.parse(await zip.file('project.json').async('string'));
    format.transform(project);
    zip.file('project.json', JSON.stringify(project));
    return zip.generateAsync({
        type: 'blob',
        mimeType: 'application/x.scratch.sb3',
        compression: 'DEFLATE'
    });
};

/**
 * Things in the project that Scratch 3 doesn't support.
 * @param {VirtualMachine} vm The VM with the project to check
 * @returns {object} Names of extensions Scratch doesn't have, the stage size if it isn't
 * Scratch's, and whether custom reporter blocks are used
 */
const getScratchProblems = vm => {
    const project = JSON.parse(vm.toJSON());
    const extensionName = id => {
        const info = vm.runtime._blockInfo.find(category => category.id === id);
        return (info && info.name) || id;
    };
    const {stageWidth, stageHeight} = vm.runtime;
    return {
        extensions: (project.extensions || [])
            .filter(id => !SCRATCH_EXTENSIONS.includes(id))
            .map(extensionName),
        stageSize: stageWidth === 480 && stageHeight === 360 ? null : `${stageWidth}×${stageHeight}`,
        customReporters: project.targets.some(target => Object.values(target.blocks)
            .some(block => block && block.opcode === 'procedures_return'))
    };
};

export {
    FORMATS,
    getFormat,
    exportProject,
    getScratchProblems
};
