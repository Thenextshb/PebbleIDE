/**
 * PenguinMod's category expansions, built in. Their blocks show inside the normal categories
 * (Motion, Events, Control, Sensing, Operators) instead of as separate extensions.
 * Extension IDs and opcodes match PenguinMod's, so projects open in both editors.
 */

import {installCorePrimitives} from './core-blocks';
import {EXPANSION_IDS} from './info';
import MotionExpansion from './motion';
import EventsExpansion from './events';
import ControlExpansion from './control';
import SensingExpansion from './sensing';
import OperatorsExpansion from './operators';

const EXTENSION_CLASSES = {
    pmMotionExpansion: MotionExpansion,
    pmEventsExpansion: EventsExpansion,
    pmControlsExpansion: ControlExpansion,
    pmSensingExpansion: SensingExpansion,
    pmOperatorsExpansion: OperatorsExpansion
};

/**
 * Add the expansions to a VM. Safe to call more than once.
 * @param {VirtualMachine} vm The VM.
 */
const installExpansions = vm => {
    if (vm.pebbleExpansionsInstalled) return;
    vm.pebbleExpansionsInstalled = true;
    installCorePrimitives(vm);
    for (const id of EXPANSION_IDS) {
        vm.extensionManager.addBuiltinExtension(id, EXTENSION_CLASSES[id]);
        if (!vm.extensionManager.isExtensionLoaded(id)) {
            vm.extensionManager.loadExtensionIdSync(id);
        }
    }
};

export {
    installExpansions
};
