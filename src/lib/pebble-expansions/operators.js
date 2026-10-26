/**
 * Operators expansion, ported from PenguinMod-Vm's pm_operatorsExpansion
 * (https://github.com/PenguinMod/PenguinMod-Vm, Mozilla Public License 2.0).
 * Its blocks are shown in the Operators category.
 */

import BlockType from 'scratch-vm/src/extension-support/block-type';
import ArgumentType from 'scratch-vm/src/extension-support/argument-type';
import Cast from 'scratch-vm/src/util/cast';

const text = (name, value) =>
    `<value name="${name}"><shadow type="text"><field name="TEXT">${value}</field></shadow></value>`;
const number = (name, value) =>
    `<value name="${name}"><shadow type="math_number"><field name="NUM">${value}</field></shadow></value>`;
const logic = opcode => `<block type="${opcode}"/>`;

// mathjs is big, so it only loads the first time "answer to" runs
let mathPromise = null;
let math = null;
const loadMath = () => {
    if (!mathPromise) {
        // Packaged projects that use it get mathjs as a separate script
        const included = typeof window !== 'undefined' && window.math && window.math.evaluate;
        mathPromise = (included ?
            Promise.resolve(window.math) :
            import(/* webpackChunkName: "mathjs" */ './vendor/mathjs.js').then(module => module.default || module))
            .then(loaded => {
                math = loaded;
                return math;
            });
    }
    return mathPromise;
};

const evaluate = equation => {
    let answer;
    try {
        answer = math.evaluate(equation);
    } catch (e) {
        return 0;
    }
    // Several lines or ";" give a set of results; use the last one
    if (answer && typeof answer === 'object' && 'entries' in answer) {
        const answers = answer.entries;
        return answers.length ? Number(answers[answers.length - 1]) : 0;
    }
    return Number(answer);
};

const numberPair = (one, two) => ({
    num1: {type: ArgumentType.NUMBER, defaultValue: one},
    num2: {type: ArgumentType.NUMBER, defaultValue: two}
});

const reporter = (opcode, label, args, extra) => Object.assign({
    opcode,
    text: label,
    blockType: BlockType.REPORTER,
    disableMonitor: true,
    arguments: args || {}
}, extra);

const boolean = (opcode, label, args) => ({
    opcode,
    text: label,
    blockType: BlockType.BOOLEAN,
    disableMonitor: true,
    arguments: args || {}
});

const joinWords = ['apple ', 'banana ', 'pear ', 'orange ', 'mango ', 'strawberry ', 'pineapple ', 'grape ', 'kiwi'];

// Old PenguinMod "join" blocks with 4 to 9 inputs. Hidden, but kept so projects using them still load.
const makeJoin = count => {
    const args = {};
    const parts = [];
    for (let i = 1; i <= count; i++) {
        args[`STRING${i}`] = {type: ArgumentType.STRING, defaultValue: joinWords[i - 1]};
        parts.push(`[STRING${i}]`);
    }
    return reporter(`join${count}`, `join ${parts.join(' ')}`, args, {hideFromPalette: true});
};

const PALETTE_BITWISE = `
<block type="pmOperatorsExpansion_shiftLeft">${number('num1', 1)}${number('num2', 5)}</block>
<block type="pmOperatorsExpansion_shiftRight">${number('num1', 32)}${number('num2', 5)}</block>
<block type="pmOperatorsExpansion_binnaryAnd">${number('num1', 32)}${number('num2', 5)}</block>
<block type="pmOperatorsExpansion_binnaryOr">${number('num1', 7)}${number('num2', 8)}</block>
<block type="pmOperatorsExpansion_binnaryXor">${number('num1', 7)}${number('num2', 2)}</block>
<block type="pmOperatorsExpansion_binnaryNot">${number('num1', 2)}</block>
<sep gap="36"/>
<block type="pmOperatorsExpansion_orIfFalsey">${text('ONE', 'a')}${text('TWO', 'b')}</block>
<block type="pmOperatorsExpansion_ifIsTruthy">${text('TWO', 'perfect!')}</block>
<sep gap="36"/>
${logic('operator_nand')}
${logic('operator_nor')}
${logic('operator_xor')}
${logic('operator_xnor')}
${logic('operator_randomBoolean')}
`;

const PALETTE_TEXT = `
<block type="operator_countAppearTimes">${text('TEXT1', 'a')}${text('TEXT2', 'abc abc abc')}</block>
<block type="operator_readLineInMultilineText">
    ${number('LINE', 1)}${text('TEXT', 'Text with multiple lines here')}
</block>
<block type="operator_textIncludesLetterFrom">${text('TEXT1', 'abcdef')}${text('TEXT2', 'fgh')}</block>
`;

const PALETTE_CHARACTERS = `
<block type="operator_character_to_code">${text('ONE', 'a')}</block>
<block type="operator_code_to_character">${text('ONE', '97')}</block>
`;

class OperatorsExpansion {
    constructor (runtime) {
        this.runtime = runtime;
        this.replacers = Object.create(null);
    }

    getInfo () {
        return {
            id: 'pmOperatorsExpansion',
            name: 'Operators Expansion',
            color1: '#59C059',
            color2: '#46B946',
            color3: '#389438',
            blocks: [
                {blockType: BlockType.XML, xml: PALETTE_BITWISE},
                reporter('shiftLeft', '[num1] << [num2]', numberPair(1, 5), {hideFromPalette: true}),
                reporter('shiftRight', '[num1] >> [num2]', numberPair(32, 5), {hideFromPalette: true}),
                reporter('binnaryAnd', '[num1] & [num2]', numberPair(32, 5), {hideFromPalette: true}),
                reporter('binnaryOr', '[num1] | [num2]', numberPair(7, 8), {hideFromPalette: true}),
                reporter('binnaryXor', '[num1] ^ [num2]', numberPair(7, 2), {hideFromPalette: true}),
                reporter('binnaryNot', '~ [num1]', {
                    num1: {type: ArgumentType.NUMBER, defaultValue: 2}
                }, {hideFromPalette: true}),
                reporter('orIfFalsey', '[ONE] or else [TWO]', {
                    ONE: {type: ArgumentType.STRING, defaultValue: 'a'},
                    TWO: {type: ArgumentType.STRING, defaultValue: 'b'}
                }, {hideFromPalette: true, allowDropAnywhere: true}),
                reporter('ifIsTruthy', 'if [ONE] is true then [TWO]', {
                    ONE: {type: ArgumentType.BOOLEAN},
                    TWO: {type: ArgumentType.STRING, defaultValue: 'perfect!'}
                }, {hideFromPalette: true, allowDropAnywhere: true}),
                '---',
                boolean('isNumberMultipleOf', 'is [NUM] multiple of [MULTIPLE]?', {
                    NUM: {type: ArgumentType.NUMBER, defaultValue: 20},
                    MULTIPLE: {type: ArgumentType.NUMBER, defaultValue: 10}
                }),
                boolean('isInteger', 'is [NUM] an integer?', {
                    NUM: {type: ArgumentType.NUMBER, defaultValue: 0.5}
                }),
                boolean('isPrime', 'is [NUM] a prime number?', {
                    NUM: {type: ArgumentType.NUMBER, defaultValue: 13}
                }),
                boolean('isEven', 'is [NUM] even?', {
                    NUM: {type: ArgumentType.NUMBER, defaultValue: 4}
                }),
                boolean('betweenNumbers', 'is [NUM] between [MIN] and [MAX]?', {
                    NUM: {type: ArgumentType.NUMBER, defaultValue: 5},
                    MIN: {type: ArgumentType.NUMBER, defaultValue: 0},
                    MAX: {type: ArgumentType.NUMBER, defaultValue: 10}
                }),
                '---',
                reporter('evaluateMath', 'answer to [EQUATION]', {
                    EQUATION: {type: ArgumentType.STRING, defaultValue: '5 * 2'}
                }),
                reporter('partOfRatio', '[PART] part of ratio [RATIO]', {
                    PART: {type: ArgumentType.STRING, menu: 'part'},
                    RATIO: {type: ArgumentType.STRING, defaultValue: '1:2'}
                }),
                reporter('simplifyRatio', 'simplify ratio [RATIO]', {
                    RATIO: {type: ArgumentType.STRING, defaultValue: '1:2'}
                }),
                reporter('pi', 'π'),
                reporter('euler', 'e'),
                reporter('infinity', '∞'),
                reporter('truncateNumber', 'truncate number [NUM]', {
                    NUM: {type: ArgumentType.NUMBER, defaultValue: 2.5}
                }),
                reporter('atan2', 'atan2 of x [X] y [Y]', {
                    X: {type: ArgumentType.NUMBER, defaultValue: 45},
                    Y: {type: ArgumentType.NUMBER, defaultValue: 90}
                }),
                '---',
                {blockType: BlockType.XML, xml: PALETTE_TEXT},
                reporter('reverseChars', 'reverse [TEXT]', {
                    TEXT: {type: ArgumentType.STRING, defaultValue: 'Hello!'}
                }),
                reporter('shuffleChars', 'shuffle [TEXT]', {
                    TEXT: {type: ArgumentType.STRING, defaultValue: 'Hello!'}
                }),
                reporter('textAfter', 'text after [TEXT] in [BASE]', {
                    TEXT: {type: ArgumentType.STRING, defaultValue: 'Hello'},
                    BASE: {type: ArgumentType.STRING, defaultValue: 'Hello world!'}
                }),
                reporter('textBefore', 'text before [TEXT] in [BASE]', {
                    TEXT: {type: ArgumentType.STRING, defaultValue: 'world'},
                    BASE: {type: ArgumentType.STRING, defaultValue: 'Hello world!'}
                }),
                '---',
                boolean('exactlyEqual', '[ONE] exactly equals [TWO]?', {
                    ONE: {type: ArgumentType.STRING, defaultValue: 'a'},
                    TWO: {type: ArgumentType.STRING, defaultValue: 'b'}
                }),
                {blockType: BlockType.XML, xml: PALETTE_CHARACTERS},
                '---',
                {
                    opcode: 'setReplacer',
                    text: 'set replacer [REPLACER] to [TEXT]',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        // eslint-disable-next-line no-template-curly-in-string
                        REPLACER: {type: ArgumentType.STRING, defaultValue: '${replacer}'},
                        TEXT: {type: ArgumentType.STRING, defaultValue: 'world'}
                    }
                },
                {
                    opcode: 'resetReplacers',
                    text: 'reset replacers',
                    blockType: BlockType.COMMAND
                },
                reporter('applyReplacers', 'apply replacers to [TEXT]', {
                    // eslint-disable-next-line no-template-curly-in-string
                    TEXT: {type: ArgumentType.STRING, defaultValue: 'Hello ${replacer}!'}
                }),
                '---',
                reporter('speedToPitch', 'speed [SPEED] to pitch', {
                    SPEED: {type: ArgumentType.NUMBER, defaultValue: 2}
                }),
                reporter('pitchToSpeed', 'pitch [PITCH] to speed', {
                    PITCH: {type: ArgumentType.NUMBER, defaultValue: 120}
                }),
                makeJoin(4),
                makeJoin(5),
                makeJoin(6),
                makeJoin(7),
                makeJoin(8),
                makeJoin(9)
            ],
            menus: {
                part: {
                    acceptReporters: true,
                    items: ['first', 'last']
                }
            }
        };
    }

    shiftLeft (args) {
        return Cast.toNumber(args.num1) << Cast.toNumber(args.num2);
    }
    shiftRight (args) {
        return Cast.toNumber(args.num1) >> Cast.toNumber(args.num2);
    }
    binnaryAnd (args) {
        return Cast.toNumber(args.num1) & Cast.toNumber(args.num2);
    }
    binnaryOr (args) {
        return Cast.toNumber(args.num1) | Cast.toNumber(args.num2);
    }
    binnaryXor (args) {
        return Cast.toNumber(args.num1) ^ Cast.toNumber(args.num2);
    }
    binnaryNot (args) {
        return ~Cast.toNumber(args.num1);
    }
    orIfFalsey (args) {
        return args.ONE || args.TWO;
    }
    ifIsTruthy (args) {
        return Cast.toBoolean(args.ONE) && args.TWO;
    }

    isNumberMultipleOf (args) {
        return (Cast.toNumber(args.NUM) % Cast.toNumber(args.MULTIPLE)) === 0;
    }
    isInteger (args) {
        const num = Cast.toNumber(args.NUM);
        return Math.trunc(num) === num;
    }
    isPrime (args) {
        const num = Math.trunc(Cast.toNumber(args.NUM));
        if (num <= 1) return false;
        for (let i = 2; i * i <= num; i++) {
            if (num % i === 0) return false;
        }
        return true;
    }
    isEven (args) {
        return Cast.toNumber(args.NUM) % 2 === 0;
    }
    betweenNumbers (args) {
        const num = Cast.toNumber(args.NUM);
        const min = Math.min(Cast.toNumber(args.MIN), Cast.toNumber(args.MAX));
        const max = Math.max(Cast.toNumber(args.MIN), Cast.toNumber(args.MAX));
        return num >= min && num <= max;
    }

    evaluateMath (args) {
        const equation = Cast.toString(args.EQUATION);
        if (equation.trim().length === 0) return 0;
        if (math) return evaluate(equation);
        return loadMath().then(() => evaluate(equation));
    }
    partOfRatio (args) {
        const ratio = Cast.toString(args.RATIO);
        if (!ratio.includes(':')) return '';
        const part = Cast.toString(args.PART).toLowerCase();
        return Cast.toNumber(ratio.split(':')[part === 'last' ? 1 : 0]);
    }
    simplifyRatio (args) {
        const ratio = Cast.toString(args.RATIO);
        if (!ratio.includes(':')) return '';
        const split = ratio.split(':');
        const first = Cast.toNumber(split[0]);
        const last = Cast.toNumber(split[1]);
        const gcd = (a, b) => (b ? gcd(b, a % b) : a);
        const divisor = gcd(first, last);
        return `${Cast.toNumber(first / divisor)}:${Cast.toNumber(last / divisor)}`;
    }
    pi () {
        return Math.PI;
    }
    euler () {
        return Math.E;
    }
    infinity () {
        return Infinity;
    }
    truncateNumber (args) {
        return Math.trunc(Cast.toNumber(args.NUM));
    }
    atan2 (args) {
        // Same formula as PenguinMod so projects give the same answers
        const x = Cast.toNumber(args.X);
        const y = Cast.toNumber(args.Y);
        return Math.atan2((y * 180) / Math.PI, (x * 180) / Math.PI);
    }

    reverseChars (args) {
        return Cast.toString(args.TEXT).split('')
            .reverse()
            .join('');
    }
    shuffleChars (args) {
        const chars = Cast.toString(args.TEXT).split('');
        for (let i = chars.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [chars[i], chars[j]] = [chars[j], chars[i]];
        }
        return chars.join('');
    }
    textAfter (args) {
        const find = Cast.toString(args.TEXT);
        const base = Cast.toString(args.BASE);
        const index = base.indexOf(find);
        return index < 0 ? '' : base.substring(index + find.length);
    }
    textBefore (args) {
        const find = Cast.toString(args.TEXT);
        const base = Cast.toString(args.BASE);
        const index = base.indexOf(find);
        return index < 0 ? '' : base.substring(0, index);
    }
    exactlyEqual (args) {
        return args.ONE === args.TWO;
    }

    setReplacer (args) {
        this.replacers[Cast.toString(args.REPLACER)] = Cast.toString(args.TEXT);
    }
    resetReplacers () {
        this.replacers = Object.create(null);
    }
    applyReplacers (args) {
        let result = Cast.toString(args.TEXT);
        for (const replacer in this.replacers) {
            result = result.split(replacer).join(this.replacers[replacer]);
        }
        return result;
    }

    speedToPitch (args) {
        return (1200 * Math.log2(Cast.toNumber(args.SPEED))) / 10;
    }
    pitchToSpeed (args) {
        return Math.pow(2, (Cast.toNumber(args.PITCH) * 10) / 1200);
    }

    _join (args, count) {
        let result = '';
        for (let i = 1; i <= count; i++) result += Cast.toString(args[`STRING${i}`]);
        return result;
    }
    join4 (args) {
        return this._join(args, 4);
    }
    join5 (args) {
        return this._join(args, 5);
    }
    join6 (args) {
        return this._join(args, 6);
    }
    join7 (args) {
        return this._join(args, 7);
    }
    join8 (args) {
        return this._join(args, 8);
    }
    join9 (args) {
        return this._join(args, 9);
    }
}

export default OperatorsExpansion;
