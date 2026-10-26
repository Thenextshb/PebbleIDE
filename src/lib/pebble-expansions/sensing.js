/**
 * Sensing expansion, ported from PenguinMod-Vm's pm_sensingExpansion
 * (https://github.com/PenguinMod/PenguinMod-Vm, Mozilla Public License 2.0).
 * Its blocks are shown in the Sensing category.
 */

import BlockType from 'scratch-vm/src/extension-support/block-type';
import ArgumentType from 'scratch-vm/src/extension-support/argument-type';
import Cast from 'scratch-vm/src/util/cast';
import Color from 'scratch-vm/src/util/color';

const text = (name, value) =>
    `<value name="${name}"><shadow type="text"><field name="TEXT">${value}</field></shadow></value>`;

const PALETTE_TEXT = `
<block type="sensing_thing_has_number">${text('TEXT1', 'abc 10 def')}</block>
<block type="sensing_isUpperCase">${text('text', 'A')}</block>
<block type="sensing_regextest">${text('text', 'foo bar')}${text('reg', 'foo')}${text('regrule', 'g')}</block>
`;

const PALETTE_KEYS = `
<block type="pmSensingExpansion_amountOfTimeKeyHasBeenHeld">
    <value name="KEY"><shadow type="sensing_keyoptions"><field name="KEY_OPTION">space</field></shadow></value>
</block>
`;

const PALETTE_SPRITES = `
<block type="sensing_getspritewithattrib">${text('var', 'my variable')}${text('val', '0')}</block>
`;

const PALETTE_BROWSER = `
<block type="sensing_getoperatingsystem"/>
<block type="sensing_getbrowser"/>
<block type="sensing_geturl"/>
`;

const URL_PARTS = ['protocol', 'host', 'hostname', 'port', 'pathname', 'search', 'hash', 'origin', 'subdomain', 'path'];

const LANGUAGES = {
    en: 'English',
    es: 'Spanish',
    fr: 'French',
    it: 'Italian',
    pt: 'Portuguese',
    de: 'German',
    ru: 'Russian',
    ar: 'Arabic',
    zh: 'Chinese (Mandarin)',
    he: 'Hebrew',
    ja: 'Japanese',
    ko: 'Korean',
    sw: 'Swahili',
    sq: 'Albanian',
    hy: 'Armenian',
    eu: 'Basque',
    nl: 'Dutch',
    ka: 'Georgian',
    gd: 'Scottish Gaelic',
    ga: 'Modern Irish',
    fa: 'Persian (Farsi)',
    bo: 'Tibetan',
    cy: 'Welsh',
    el: 'Modern Greek',
    grc: 'Ancient Greek',
    la: 'Latin',
    ang: 'Anglo-Saxon',
    enm: 'Middle English'
};

const isValidUrl = url => {
    try {
        // eslint-disable-next-line no-new
        new URL(url);
        return true;
    } catch (e) {
        return false;
    }
};

const urlPart = (part, url) => {
    if (!URL_PARTS.includes(part)) return '';
    if (part === 'subdomain') {
        const origin = url.origin;
        if (origin.split('.').length <= 2) return '';
        const subdomain = origin.split('.')[0].split('//')[1];
        return subdomain ? subdomain.replace(/\./g, '') : '';
    }
    if (part === 'path') {
        const origin = url.origin;
        return url.href.replace(origin.endsWith('/') ? origin : `${origin}/`, '');
    }
    return Cast.toString(url[part]);
};

const getBattery = () => (typeof navigator !== 'undefined' && navigator.getBattery ?
    navigator.getBattery().catch(() => null) :
    Promise.resolve(null));

const reporter = (opcode, label, args, extra) => Object.assign({
    opcode,
    text: label,
    blockType: BlockType.REPORTER,
    disableMonitor: true,
    arguments: args || {}
}, extra);

class SensingExpansion {
    constructor (runtime) {
        this.runtime = runtime;
        this.canVibrate = true;
        this.lastUpdate = Date.now();
        this.loudnessTimer = null;
        this.loudnessHistory = [0];
        this.scrollDistance = 0;
        this.lastValues = {};
        this.keyTimestamps = {};
        this._trackInput();
    }

    // PenguinMod tracks these in its keyboard and mouse wheel code
    _trackInput () {
        const keyboard = this.runtime.ioDevices.keyboard;
        const originalKeyboardPost = keyboard.postData;
        keyboard.postData = data => {
            originalKeyboardPost.call(keyboard, data);
            if (!data.key) return;
            const key = keyboard._keyStringToScratchKey(data.key);
            if (!key) return;
            if (data.isDown) {
                if (!(key in this.keyTimestamps)) this.keyTimestamps[key] = Date.now();
            } else {
                delete this.keyTimestamps[key];
            }
        };

        const mouseWheel = this.runtime.ioDevices.mouseWheel;
        const originalWheelPost = mouseWheel.postData;
        mouseWheel.postData = data => {
            originalWheelPost.call(mouseWheel, data);
            this.scrollDistance -= Cast.toNumber(data.deltaY);
        };
    }

    getInfo () {
        return {
            id: 'pmSensingExpansion',
            name: 'Sensing Expansion',
            color1: '#5CB1D6',
            color2: '#47A8D1',
            color3: '#2E8EB8',
            blocks: [
                {blockType: BlockType.XML, xml: PALETTE_TEXT},
                '---',
                reporter('scrollingDistance', 'scrolling distance', null, {disableMonitor: false}),
                {
                    opcode: 'setScrollingDistance',
                    text: 'set scrolling distance to [AMOUNT]',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        AMOUNT: {type: ArgumentType.NUMBER, defaultValue: 0}
                    }
                },
                {
                    opcode: 'changeScrollingDistanceBy',
                    text: 'change scrolling distance by [AMOUNT]',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        AMOUNT: {type: ArgumentType.NUMBER, defaultValue: 100}
                    }
                },
                reporter('currentKeyPressed', 'current key pressed', null, {disableMonitor: false}),
                {blockType: BlockType.XML, xml: PALETTE_KEYS},
                reporter('amountOfTimeKeyHasBeenHeld', 'seconds since holding [KEY]', {
                    KEY: {type: ArgumentType.STRING, defaultValue: 'space'}
                }, {hideFromPalette: true}),
                reporter('getLastKeyPressed', 'last key pressed', null, {disableMonitor: false}),
                {
                    opcode: 'getButtonIsDown',
                    text: '[MOUSE_BUTTON] mouse button down?',
                    blockType: BlockType.BOOLEAN,
                    arguments: {
                        MOUSE_BUTTON: {
                            type: ArgumentType.NUMBER,
                            menu: 'mouseButton',
                            defaultValue: '0'
                        }
                    }
                },
                {
                    opcode: 'changed',
                    text: '[ONE] changed?',
                    blockType: BlockType.BOOLEAN,
                    disableMonitor: true,
                    arguments: {
                        ONE: {type: ArgumentType.STRING, defaultValue: ''}
                    }
                },
                '---',
                reporter('spriteName', 'sprite name'),
                {blockType: BlockType.XML, xml: PALETTE_SPRITES},
                reporter('maxSpriteLayers', 'max sprite layers', null, {disableMonitor: false}),
                '---',
                reporter('urlOptions', 'url [OPTIONS]', {
                    OPTIONS: {type: ArgumentType.STRING, menu: 'urlSections'}
                }),
                reporter('urlOptionsOf', '[OPTIONS] of url [URL]', {
                    OPTIONS: {type: ArgumentType.STRING, menu: 'urlSections'},
                    URL: {type: ArgumentType.STRING, defaultValue: 'https://example.com:3000/some/page?param=10#20'}
                }),
                reporter('queryParamOfUrl', 'query parameter [PARAM] of url [URL]', {
                    PARAM: {type: ArgumentType.STRING, defaultValue: 'param'},
                    URL: {type: ArgumentType.STRING, defaultValue: 'https://example.com/?param=10'}
                }),
                {
                    opcode: 'setUrlEnd',
                    text: 'set url path to [PATH]',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        PATH: {
                            type: ArgumentType.STRING,
                            defaultValue: '?parameter=10#you-can-change-these-without-refreshing'
                        }
                    }
                },
                {
                    opcode: 'setUsername',
                    text: 'set username to [NAME]',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        NAME: {type: ArgumentType.STRING, defaultValue: 'Pebble'}
                    }
                },
                {
                    opcode: 'packaged',
                    text: 'project packaged?',
                    blockType: BlockType.BOOLEAN,
                    disableMonitor: true
                },
                {
                    opcode: 'framed',
                    text: 'project in iframe?',
                    blockType: BlockType.BOOLEAN,
                    disableMonitor: true
                },
                '---',
                {blockType: BlockType.XML, xml: PALETTE_BROWSER},
                reporter('browserLanguage', 'preferred language'),
                '---',
                reporter('currentMillisecond', 'current millisecond', null, {disableMonitor: false}),
                reporter('deltaTime', 'delta time', null, {disableMonitor: false}),
                reporter('pickColor', 'grab color at x: [X] y: [Y]', {
                    X: {type: ArgumentType.NUMBER, defaultValue: 0},
                    Y: {type: ArgumentType.NUMBER, defaultValue: 0}
                }, {disableMonitor: false}),
                reporter('averageLoudness', 'average loudness', null, {disableMonitor: false}),
                '---',
                reporter('batteryPercentage', 'battery percentage'),
                {
                    opcode: 'batteryCharging',
                    text: 'is device charging?',
                    blockType: BlockType.BOOLEAN,
                    disableMonitor: true
                },
                {
                    opcode: 'vibrateDevice',
                    text: 'vibrate',
                    blockType: BlockType.COMMAND
                }
            ],
            menus: {
                mouseButton: {
                    acceptReporters: true,
                    items: [
                        {text: '(0) primary', value: '0'},
                        {text: '(1) middle', value: '1'},
                        {text: '(2) secondary', value: '2'}
                    ]
                },
                urlSections: {
                    acceptReporters: true,
                    items: URL_PARTS
                }
            }
        };
    }

    getLastKeyPressed (args, util) {
        return util.ioQuery('keyboard', 'getLastKeyPressed');
    }

    getButtonIsDown (args, util) {
        return util.ioQuery('mouse', 'getButtonIsDown', [Cast.toNumber(args.MOUSE_BUTTON)]);
    }

    changed (args, util) {
        const id = util.thread.peekStack();
        const value = Cast.toString(args.ONE);
        if (!(id in this.lastValues)) {
            this.lastValues[id] = value;
            return false;
        }
        if (value !== this.lastValues[id]) {
            this.lastValues[id] = value;
            return true;
        }
        return false;
    }

    pickColor (args) {
        const renderer = this.runtime.renderer;
        if (!renderer) return '#000000';
        const canvas = renderer._gl.canvas;
        const {stageWidth, stageHeight} = this.runtime;
        const x = Math.round((((stageWidth / 2) + Cast.toNumber(args.X)) / stageWidth) * canvas.clientWidth);
        const y = Math.round((((stageHeight / 2) - Cast.toNumber(args.Y)) / stageHeight) * canvas.clientHeight);
        const colorInfo = renderer.extractColor(x, y, 20);
        return Color.rgbToHex(colorInfo.color);
    }

    batteryPercentage () {
        return getBattery().then(battery => (battery ? battery.level * 100 : 100));
    }

    batteryCharging () {
        return getBattery().then(battery => (battery ? battery.charging : true));
    }

    maxSpriteLayers () {
        const renderer = this.runtime.renderer;
        return renderer ? renderer._drawList.length - 1 : 0;
    }

    averageLoudness () {
        if (!this.loudnessTimer) {
            // Only start listening once the block is used
            this.loudnessTimer = setInterval(() => {
                const loudness = this.runtime.audioEngine && this.runtime.audioEngine.getLoudness();
                if (typeof loudness !== 'number') return;
                if (this.loudnessHistory.length > 20) this.loudnessHistory.shift();
                this.loudnessHistory.push(Math.max(0, loudness));
            }, 50);
        }
        const total = this.loudnessHistory.reduce((sum, loudness) => sum + loudness, 0);
        return total / this.loudnessHistory.length;
    }

    scrollingDistance () {
        return this.scrollDistance;
    }
    setScrollingDistance (args) {
        this.scrollDistance = Cast.toNumber(args.AMOUNT);
    }
    changeScrollingDistanceBy (args) {
        this.scrollDistance += Cast.toNumber(args.AMOUNT);
    }

    currentKeyPressed () {
        const keys = this.runtime.ioDevices.keyboard._keysPressed;
        const key = keys[keys.length - 1];
        return key ? Cast.toString(key).toLowerCase() : '';
    }

    amountOfTimeKeyHasBeenHeld (args) {
        const keyArg = Cast.toString(args.KEY);
        let timestamp;
        if (keyArg === 'any') {
            const all = Object.values(this.keyTimestamps);
            timestamp = all.length ? Math.min(...all) : 0;
        } else {
            const key = this.runtime.ioDevices.keyboard._keyArgToScratchKey(keyArg);
            timestamp = this.keyTimestamps[key] || 0;
        }
        return timestamp ? (Date.now() - timestamp) / 1000 : 0;
    }

    vibrateDevice () {
        // At most once a second so projects can't buzz nonstop
        if (!this.canVibrate || typeof navigator === 'undefined' || !navigator.vibrate) return;
        this.canVibrate = false;
        navigator.vibrate(250);
        setTimeout(() => {
            this.canVibrate = true;
        }, 1000);
    }

    browserLanguage () {
        if (typeof navigator === 'undefined' || !navigator.language) return 'Unknown';
        const code = Cast.toString(navigator.language).split('-')[0]
            .toLowerCase();
        return LANGUAGES[code] || 'Unknown';
    }

    urlOptions (args) {
        if (typeof location === 'undefined') return '';
        return urlPart(Cast.toString(args.OPTIONS).toLowerCase(), location);
    }

    urlOptionsOf (args) {
        const url = Cast.toString(args.URL);
        if (!isValidUrl(url)) return '';
        return urlPart(Cast.toString(args.OPTIONS).toLowerCase(), new URL(url));
    }

    setUsername (args) {
        this.runtime.ioDevices.userData.postData({
            username: Cast.toString(args.NAME)
        });
    }

    setUrlEnd (args) {
        if (typeof history === 'undefined') return;
        const path = Cast.toString(args.PATH);
        const origin = location.origin;
        history.replaceState('', '', origin.endsWith('/') ? origin + path : `${origin}/${path}`);
    }

    queryParamOfUrl (args) {
        const url = Cast.toString(args.URL);
        if (!isValidUrl(url)) return '';
        const value = new URL(url).searchParams.get(Cast.toString(args.PARAM));
        return value === null ? '' : value;
    }

    packaged () {
        return !!this.runtime.isPackaged;
    }

    spriteName (args, util) {
        return util.target.getName();
    }

    framed () {
        return typeof window !== 'undefined' && window.parent !== window;
    }

    currentMillisecond () {
        return Date.now() % 1000;
    }

    deltaTime () {
        const now = Date.now();
        const delta = now - this.lastUpdate;
        this.lastUpdate = now;
        return delta;
    }
}

export default SensingExpansion;
