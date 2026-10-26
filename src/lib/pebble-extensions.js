// Removing and replacing extensions. The VM can only add extensions, so these work with its internals.

/**
 * @param {VirtualMachine} vm The VM
 * @param {string} id Extension ID
 * @returns {object|null} The extension's category info, or null if it isn't a loaded extension
 */
const getExtensionInfo = (vm, id) => vm.runtime._blockInfo.find(info => info.id === id) || null;

// Clones share their original's blocks, so only originals need to be looked at.
const getBlockContainers = vm => vm.runtime.targets
    .filter(target => target.isOriginal)
    .map(target => target.blocks);

/**
 * @param {VirtualMachine} vm The VM
 * @param {string} id Extension ID
 * @returns {number} How many of the extension's blocks are in the project
 */
const countExtensionBlocks = (vm, id) => {
    const prefix = `${id}_`;
    let count = 0;
    for (const blocks of getBlockContainers(vm)) {
        for (const block of Object.values(blocks._blocks)) {
            if (block && !block.shadow && block.opcode.startsWith(prefix)) {
                count++;
            }
        }
    }
    return count;
};

/**
 * Delete a block, joining the blocks above and below it back together.
 * @param {Blocks} blocks The block container
 * @param {object} block The block to delete
 */
const deleteBlockAndHeal = (blocks, block) => {
    const next = block.next ? blocks._blocks[block.next] : null;
    const parent = block.parent ? blocks._blocks[block.parent] : null;
    if (parent) {
        if (parent.next === block.id) {
            parent.next = next ? next.id : null;
        } else {
            for (const input of Object.values(parent.inputs)) {
                if (input.block === block.id) {
                    // A reporter's input falls back to its original value, a C block's slot to the next block
                    input.block = next ? next.id : input.shadow;
                }
            }
        }
        if (next) {
            next.parent = parent.id;
        }
    } else if (next) {
        // The rest of the script stays where it was
        next.parent = null;
        next.topLevel = true;
        next.x = block.x;
        next.y = block.y;
        blocks._scripts.push(next.id);
    }
    block.next = null;
    blocks.deleteBlock(block.id);
};

const deleteExtensionBlocks = (vm, id) => {
    const prefix = `${id}_`;
    for (const blocks of [...getBlockContainers(vm), vm.runtime.monitorBlocks]) {
        const ids = Object.keys(blocks._blocks)
            .filter(blockId => {
                const block = blocks._blocks[blockId];
                return block && !block.shadow && block.opcode.startsWith(prefix);
            });
        for (const blockId of ids) {
            // It may already be gone if it was inside another of the extension's blocks
            const block = blocks._blocks[blockId];
            if (!block) continue;
            if (blocks === vm.runtime.monitorBlocks) {
                vm.runtime.requestRemoveMonitor(blockId);
            }
            deleteBlockAndHeal(blocks, block);
        }
        blocks.resetCache();
    }
};

const renameExtensionBlocks = (vm, oldId, newId) => {
    const oldPrefix = `${oldId}_`;
    const newPrefix = `${newId}_`;
    for (const blocks of [...getBlockContainers(vm), vm.runtime.monitorBlocks]) {
        for (const block of Object.values(blocks._blocks)) {
            if (block && block.opcode.startsWith(oldPrefix)) {
                block.opcode = newPrefix + block.opcode.substring(oldPrefix.length);
            }
        }
        blocks.resetCache();
    }
};

const getWorkerId = serviceName => {
    // Custom extensions have service names like "extension.WORKER_ID.EXTENSION_ID"
    const parts = serviceName ? serviceName.split('.') : [];
    if (parts.length === 3 && (parts[0] === 'extension' || parts[0] === 'unsandboxed')) {
        return +parts[1];
    }
    return null;
};

/**
 * Take an extension out of the VM, so it disappears from the block list and isn't saved with the project.
 * @param {VirtualMachine} vm The VM
 * @param {string} id Extension ID
 * @returns {object} What was removed, for restoreExtension()
 */
const unregisterExtension = (vm, id) => {
    const extensionManager = vm.extensionManager;
    const serviceName = extensionManager._loadedExtensions.get(id) || null;
    extensionManager._loadedExtensions.delete(id);

    const index = vm.runtime._blockInfo.findIndex(info => info.id === id);
    const info = index === -1 ? null : vm.runtime._blockInfo.splice(index, 1)[0];

    // Forget the URL it was loaded from, unless another loaded extension came from the same script
    const workerId = getWorkerId(serviceName);
    let url = null;
    if (workerId !== null) {
        const stillUsed = Array.from(extensionManager._loadedExtensions.values())
            .some(otherServiceName => getWorkerId(otherServiceName) === workerId);
        if (!stillUsed && typeof extensionManager.workerURLs[workerId] === 'string') {
            url = extensionManager.workerURLs[workerId];
            delete extensionManager.workerURLs[workerId];
        }
    }

    return {serviceName, index, info, workerId, url};
};

const restoreExtension = (vm, id, removed) => {
    if (removed.serviceName) {
        vm.extensionManager._loadedExtensions.set(id, removed.serviceName);
    }
    if (removed.info) {
        vm.runtime._blockInfo.splice(removed.index, 0, removed.info);
    }
    if (removed.url !== null) {
        vm.extensionManager.workerURLs[removed.workerId] = removed.url;
    }
};

// Update the block list and the code area after the VM was changed directly
const refreshEditor = (vm, id) => {
    vm.emit('BLOCKSINFO_UPDATE', {
        id,
        customFieldTypes: {},
        menus: [],
        blocks: []
    });
    vm.emitWorkspaceUpdate();
    vm.runtime.emitProjectChanged();
};

/**
 * Remove an extension and delete its blocks from the project.
 * @param {VirtualMachine} vm The VM
 * @param {string} id Extension ID
 */
const removeExtension = (vm, id) => {
    vm.stopAll();
    deleteExtensionBlocks(vm, id);
    unregisterExtension(vm, id);
    refreshEditor(vm, id);
};

/**
 * Replace an extension with another one. Blocks move over to the new extension; blocks it doesn't
 * have stay in the project but won't work until an extension with them is added.
 * @param {VirtualMachine} vm The VM
 * @param {string} oldId ID of the extension being replaced
 * @param {function(): Promise} load Loads the new extension
 * @param {string} [existingId] ID of the new extension if it might already be in the project
 * @returns {Promise<string|null>} ID of the new extension, or null if there was nothing to replace it with
 */
const replaceExtension = async (vm, oldId, load, existingId) => {
    const extensionManager = vm.extensionManager;
    const loadedBefore = new Set(extensionManager._loadedExtensions.keys());
    vm.stopAll();

    // Take the old one out first so a newer version with the same ID can load
    const removed = unregisterExtension(vm, oldId);
    try {
        await load();
    } catch (e) {
        restoreExtension(vm, oldId, removed);
        refreshEditor(vm, oldId);
        throw e;
    }

    let newId = null;
    if (extensionManager._loadedExtensions.has(oldId)) {
        newId = oldId;
    } else {
        newId = Array.from(extensionManager._loadedExtensions.keys())
            .find(id => !loadedBefore.has(id)) || null;
    }
    if (newId === null && existingId && existingId !== oldId && extensionManager.isExtensionLoaded(existingId)) {
        newId = existingId;
    }
    if (newId === null) {
        restoreExtension(vm, oldId, removed);
        refreshEditor(vm, oldId);
        return null;
    }

    if (newId !== oldId) {
        renameExtensionBlocks(vm, oldId, newId);
    }
    refreshEditor(vm, oldId);
    return newId;
};

// The extension the user asked to replace. The next extension picked from the library or loaded
// as a custom extension replaces it instead of being added.
let replaceTarget = null;

const setReplaceTarget = id => {
    replaceTarget = id;
};

const getReplaceTarget = () => replaceTarget;

const takeReplaceTarget = () => {
    const target = replaceTarget;
    replaceTarget = null;
    return target;
};

const clearReplaceTarget = () => {
    replaceTarget = null;
};

export {
    getExtensionInfo,
    countExtensionBlocks,
    removeExtension,
    replaceExtension,
    setReplaceTarget,
    getReplaceTarget,
    takeReplaceTarget,
    clearReplaceTarget
};
