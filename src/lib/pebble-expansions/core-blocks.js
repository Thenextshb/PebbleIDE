/**
 * PenguinMod's extra built-in blocks that its category expansions show, such as
 * "turn around x/y", "nand" and "operating system". Opcodes match PenguinMod's so projects
 * open in both editors.
 *
 * Block behavior is ported from PenguinMod-Vm (https://github.com/PenguinMod/PenguinMod-Vm),
 * Mozilla Public License 2.0. Block shapes follow PenguinMod-Blocks.
 */

import Cast from 'scratch-vm/src/util/cast';
import MathUtil from 'scratch-vm/src/util/math-util';
import BlockType from 'scratch-vm/src/extension-support/block-type';
import compatBlocks from 'scratch-vm/src/compiler/compat-blocks';
import {ScriptTreeGenerator} from 'scratch-vm/src/compiler/irgen';

const isValidRegex = (pattern, flags) => {
    try {
        // eslint-disable-next-line no-new
        new RegExp(pattern, flags);
        return true;
    } catch (e) {
        return false;
    }
};

const getOperatingSystem = () => {
    if (typeof navigator === 'undefined' || !navigator.userAgent) return 'Unknown';
    const agent = navigator.userAgent;
    if (agent.includes('Windows')) return 'Windows';
    if (agent.includes('Android')) return 'Android';
    if (agent.includes('iPad') || agent.includes('iPod') || agent.includes('iPhone')) return 'iOS';
    if (agent.includes('Linux')) return 'Linux';
    if (agent.includes('CrOS')) return 'ChromeOS';
    if (agent.includes('Mac OS')) return 'MacOS';
    return 'Unknown';
};

const getBrowser = () => {
    if (typeof navigator === 'undefined' || !navigator.userAgent) return 'Unknown';
    const agent = navigator.userAgent;
    if (navigator.userAgentData) {
        const brands = JSON.stringify(navigator.userAgentData.brands);
        if (brands.includes('Google Chrome')) return 'Chrome';
        if (brands.includes('Opera')) return 'Opera';
        if (brands.includes('Microsoft Edge')) return 'Edge';
    }
    if (agent.includes('Chrome')) return 'Chrome';
    if (agent.includes('Firefox')) return 'Firefox';
    if (agent.includes('Safari')) return 'Safari';
    return 'Unknown';
};

const turnAround = (degrees, centerX, centerY, target) => {
    const radians = (Math.PI * degrees) / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const dx = target.x - centerX;
    const dy = target.y - centerY;
    target.setXY((cos * dx) - (sin * dy) + centerX, (cos * dy) + (sin * dx) + centerY);
};

/**
 * @param {Runtime} runtime The VM runtime.
 * @returns {object.<string, Function>} Block functions by opcode.
 */
const makePrimitives = runtime => {
    const control = () => runtime.ext_scratch3_control;
    return {
        motion_turnrightaroundxy (args, util) {
            turnAround(-Cast.toNumber(args.DEGREES), Cast.toNumber(args.X), Cast.toNumber(args.Y), util.target);
        },
        motion_turnleftaroundxy (args, util) {
            turnAround(Cast.toNumber(args.DEGREES), Cast.toNumber(args.X), Cast.toNumber(args.Y), util.target);
        },
        motion_ifonxybounce (args, util) {
            const x = Cast.toNumber(args.X);
            const y = Cast.toNumber(args.Y);
            const target = util.target;
            const bounds = target.getBounds();
            if (!bounds) return;
            const inside = x >= bounds.left && x <= bounds.right && y >= bounds.bottom && y <= bounds.top;
            if (!inside) return;
            // Bounce off whichever side of the sprite is nearest the point
            let nearestEdge = '';
            let minDistance = Infinity;
            for (const side of ['left', 'top', 'right', 'bottom']) {
                const horizontal = side === 'left' || side === 'right';
                const distX = horizontal ? x - bounds[side] : x - target.x;
                const distY = horizontal ? y - target.y : y - bounds[side];
                const distance = Math.sqrt((distX * distX) + (distY * distY));
                if (distance < minDistance) {
                    minDistance = distance;
                    nearestEdge = side;
                }
            }
            const radians = MathUtil.degToRad(90 - target.direction);
            let dx = Math.cos(radians);
            let dy = -Math.sin(radians);
            if (nearestEdge === 'left') dx = Math.max(0.2, Math.abs(dx));
            else if (nearestEdge === 'top') dy = Math.max(0.2, Math.abs(dy));
            else if (nearestEdge === 'right') dx = 0 - Math.max(0.2, Math.abs(dx));
            else if (nearestEdge === 'bottom') dy = 0 - Math.max(0.2, Math.abs(dy));
            target.setDirection(MathUtil.radToDeg(Math.atan2(dy, dx)) + 90);
            const fenced = target.keepInFence(target.x, target.y);
            target.setXY(fenced[0], fenced[1]);
        },

        control_repeatForSeconds (args, util) {
            if (util.stackTimerNeedsInit()) {
                util.startStackTimer(Math.max(0, 1000 * Cast.toNumber(args.TIMES)));
                runtime.requestRedraw();
                util.startBranch(1, true);
            } else if (!util.stackTimerFinished()) {
                util.startBranch(1, true);
            }
        },
        control_waittick (args, util) {
            // The block runs again after the tick, so remember that it already waited
            if (!util.stackFrame.waitedTick) {
                util.stackFrame.waitedTick = true;
                util.yieldTick();
            }
        },
        control_decr_counter () {
            control()._counter--;
        },
        control_set_counter (args) {
            control()._counter = Cast.toNumber(args.VALUE);
        },

        operator_nand: args => !(Cast.toBoolean(args.OPERAND1) && Cast.toBoolean(args.OPERAND2)),
        operator_nor: args => !(Cast.toBoolean(args.OPERAND1) || Cast.toBoolean(args.OPERAND2)),
        operator_xor: args => Cast.toBoolean(args.OPERAND1) !== Cast.toBoolean(args.OPERAND2),
        operator_xnor: args => Cast.toBoolean(args.OPERAND1) === Cast.toBoolean(args.OPERAND2),
        operator_randomBoolean: () => Math.random() < 0.5,
        operator_join3: args => Cast.toString(args.STRING1) + Cast.toString(args.STRING2) + Cast.toString(args.STRING3),
        operator_readLineInMultilineText (args) {
            const line = (Cast.toNumber(args.LINE) || 1) - 1;
            return Cast.toString(args.TEXT).split('\n')[line] || '';
        },
        operator_character_to_code (args) {
            const text = Cast.toString(args.ONE);
            return text ? text.charCodeAt(0) : NaN;
        },
        operator_code_to_character: args => String.fromCharCode(Cast.toNumber(args.ONE)),
        operator_countAppearTimes (args) {
            const parts = Cast.toString(args.TEXT2).split(Cast.toString(args.TEXT1));
            return parts.length <= 1 ? 0 : parts.length - 1;
        },
        operator_textIncludesLetterFrom (args) {
            const text = Cast.toString(args.TEXT1);
            return Cast.toString(args.TEXT2).split('')
                .some(letter => text.includes(letter));
        },

        sensing_thing_has_number: args => /\d/.test(Cast.toString(args.TEXT1)),
        sensing_isUpperCase: args => /[A-Z]/.test(Cast.toString(args.text)),
        sensing_regextest (args) {
            const pattern = Cast.toString(args.reg);
            const flags = Cast.toString(args.regrule);
            if (!isValidRegex(pattern, flags)) return false;
            return new RegExp(pattern, flags).test(Cast.toString(args.text));
        },
        sensing_getspritewithattrib (args) {
            const name = Cast.toString(args.var);
            const value = Cast.toString(args.val);
            for (const target of runtime.targets) {
                const variable = Object.values(target.variables).find(v => v.name === name);
                if (variable && String(variable.value) === value) {
                    return JSON.stringify({
                        id: target.id,
                        name: target.sprite ? target.sprite.name : 'Unknown'
                    });
                }
            }
            return 'No sprites found';
        },
        sensing_getoperatingsystem: getOperatingSystem,
        sensing_getbrowser: getBrowser,
        sensing_geturl: () => (typeof location === 'undefined' ? '' : location.href)
    };
};

const STACK_OPCODES = [
    'motion_turnrightaroundxy',
    'motion_turnleftaroundxy',
    'motion_ifonxybounce',
    'control_repeatForSeconds',
    'control_waittick',
    'control_decr_counter',
    'control_set_counter'
];

// The compiler only gives branches to blocks it knows are loops
const NATIVE_BLOCK_INFO = {
    control_repeatForSeconds: {
        info: {
            opcode: 'repeatForSeconds',
            blockType: BlockType.LOOP,
            branchCount: 1
        }
    }
};

let compilerPatched = false;
const patchCompiler = () => {
    if (compilerPatched) return;
    compilerPatched = true;
    const originalGetBlockInfo = ScriptTreeGenerator.prototype.getBlockInfo;
    ScriptTreeGenerator.prototype.getBlockInfo = function (fullOpcode) {
        return NATIVE_BLOCK_INFO[fullOpcode] || originalGetBlockInfo.call(this, fullOpcode);
    };
};

/**
 * Add the block functions to a VM.
 * @param {VirtualMachine} vm The VM.
 */
const installCorePrimitives = vm => {
    const primitives = makePrimitives(vm.runtime);
    for (const [opcode, fn] of Object.entries(primitives)) {
        vm.runtime._primitives[opcode] = fn;
        const list = STACK_OPCODES.includes(opcode) ? compatBlocks.stacked : compatBlocks.inputs;
        if (!list.includes(opcode)) list.push(opcode);
    }
    patchCompiler();
};

const numberInput = name => ({type: 'input_value', name});

/**
 * Define how the blocks look in scratch-blocks.
 * @param {ScratchBlocks} ScratchBlocks The scratch-blocks instance.
 */
const defineCoreBlocks = ScratchBlocks => {
    // The main workspace may not exist yet when the palette is first built
    const media = (block, file) => {
        const workspace = block.workspace || ScratchBlocks.mainWorkspace;
        return `${workspace && workspace.options ? workspace.options.pathToMedia : ''}${file}`;
    };
    const define = (opcode, getJson) => {
        ScratchBlocks.Blocks[opcode] = {
            init () {
                this.jsonInit(getJson(this));
            }
        };
    };
    const reporter = (category, output, message, inputs = []) => () => ({
        message0: message,
        args0: inputs.map(input => (typeof input === 'string' ? numberInput(input) : input)),
        inputsInline: true,
        category: ScratchBlocks.Categories[category],
        extensions: [`colours_${category}`, output]
    });
    const statement = (category, message, getArgs = () => []) => block => ({
        message0: message,
        args0: getArgs(block),
        category: ScratchBlocks.Categories[category],
        extensions: [`colours_${category}`, 'shape_statement']
    });
    const turnAroundBlock = icon => statement('motion', 'turn %1 %2 degrees around x: %3 y: %4', block => [
        {type: 'field_image', src: media(block, icon), width: 24, height: 24},
        numberInput('DEGREES'),
        numberInput('X'),
        numberInput('Y')
    ]);
    const booleanInput = name => ({type: 'input_value', name, check: 'Boolean'});

    define('motion_turnrightaroundxy', turnAroundBlock('rotate-right.svg'));
    define('motion_turnleftaroundxy', turnAroundBlock('rotate-left.svg'));
    define('motion_ifonxybounce', statement('motion', 'if touching x: %1 y: %2, bounce', () => [
        numberInput('X'),
        numberInput('Y')
    ]));

    define('control_repeatForSeconds', block => ({
        message0: 'repeat for %1 seconds',
        message1: '%1',
        message2: '%1',
        lastDummyAlign2: 'RIGHT',
        args0: [numberInput('TIMES')],
        args1: [{type: 'input_statement', name: 'SUBSTACK'}],
        args2: [{
            type: 'field_image',
            src: media(block, 'repeat.svg'),
            width: 24,
            height: 24,
            alt: '*',
            flip_rtl: true
        }],
        category: ScratchBlocks.Categories.control,
        extensions: ['colours_control', 'shape_statement']
    }));
    define('control_waittick', statement('control', 'wait until next tick'));
    define('control_decr_counter', statement('control', 'decrement counter'));
    define('control_set_counter', statement('control', 'set counter to %1', () => [numberInput('VALUE')]));

    const logic = word => reporter('operators', 'output_boolean', `%1 ${word} %2`, [
        booleanInput('OPERAND1'),
        booleanInput('OPERAND2')
    ]);
    define('operator_nand', logic('nand'));
    define('operator_nor', logic('nor'));
    define('operator_xor', logic('xor'));
    define('operator_xnor', logic('xnor'));
    define('operator_randomBoolean', reporter('operators', 'output_boolean', 'random'));
    define('operator_join3', reporter('operators', 'output_string', 'join %1 %2 %3', [
        'STRING1',
        'STRING2',
        'STRING3'
    ]));
    define('operator_countAppearTimes', reporter('operators', 'output_number', 'amount of times %1 appears in %2', [
        'TEXT1',
        'TEXT2'
    ]));
    define('operator_readLineInMultilineText', reporter('operators', 'output_string', 'read line %1 in %2', [
        'LINE',
        'TEXT'
    ]));
    define('operator_textIncludesLetterFrom', reporter('operators', 'output_boolean', '%1 includes a letter from %2?', [
        'TEXT1',
        'TEXT2'
    ]));
    define('operator_character_to_code', reporter('operators', 'output_number', 'character %1 to id', ['ONE']));
    define('operator_code_to_character', reporter('operators', 'output_string', 'id %1 to character', ['ONE']));

    define('sensing_thing_has_number', reporter('sensing', 'output_boolean', '%1 has number?', ['TEXT1']));
    define('sensing_isUpperCase', reporter('sensing', 'output_boolean', 'is character %1 uppercase?', ['text']));
    define('sensing_regextest', reporter('sensing', 'output_boolean', 'test regex %2 %3 with text %1', [
        'text',
        'reg',
        'regrule'
    ]));
    define('sensing_getspritewithattrib', reporter('sensing', 'output_string', 'get sprite with %1 set to %2', [
        'var',
        'val'
    ]));
    define('sensing_getoperatingsystem', reporter('sensing', 'output_string', 'operating system'));
    define('sensing_getbrowser', reporter('sensing', 'output_string', 'browser'));
    define('sensing_geturl', reporter('sensing', 'output_string', 'url'));
};

export {
    defineCoreBlocks,
    installCorePrimitives
};
