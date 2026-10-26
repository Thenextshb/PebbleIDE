/**
 * Custom block (My Blocks) colors.
 *
 * A custom block's color lives on its procedure mutation as `color`, a JSON array of
 * [primary, secondary, tertiary] hex colors. This is the same format PenguinMod uses,
 * so colors carry over when a project is opened there. Blocks without the attribute
 * use the theme's normal My Blocks color.
 *
 * The define hat, the arguments in it and the return block take their color from the
 * custom block they belong to, so they don't store it themselves.
 */

const COLOR_ATTRIBUTE = 'color';
const HEX_PATTERN = /^#[0-9a-f]{6}/i;

// Blocks that carry the procedure mutation
const MUTATION_TYPES = ['procedures_call', 'procedures_prototype', 'procedures_declaration'];
// Blocks that are colored by the definition they're in
const ARGUMENT_TYPES = ['argument_reporter_string_number', 'argument_reporter_boolean'];
const CONTEXT_TYPES = [...ARGUMENT_TYPES, 'procedures_return'];

const DARK_TEXT_CLASS = 'pebble-custom-block-dark-text';
const LIGHT_TEXT_CLASS = 'pebble-custom-block-light-text';

// Ready-made colors for the Make a Block editor, all readable with white text
const CUSTOM_BLOCK_SWATCHES = [
    {id: 'red', color: '#F2494B'},
    {id: 'orange', color: '#FF8C1A'},
    {id: 'yellow', color: '#FFBF00'},
    {id: 'green', color: '#4CBF56'},
    {id: 'teal', color: '#0FBDA8'},
    {id: 'blue', color: '#4C97FF'},
    {id: 'indigo', color: '#5E5CE6'},
    {id: 'purple', color: '#9966FF'},
    {id: 'pink', color: '#E65CB8'},
    {id: 'grey', color: '#8A8F9E'},
    {id: 'charcoal', color: '#4D4F5C'}
];

const hexToRgb = hex => [1, 3, 5].map(i => parseInt(hex.substr(i, 2), 16) / 255);

const rgbToHsl = ([r, g, b]) => {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    if (max === min) return [0, 0, l];
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h;
    if (max === r) h = ((g - b) / d) + (g < b ? 6 : 0);
    else if (max === g) h = ((b - r) / d) + 2;
    else h = ((r - g) / d) + 4;
    return [h / 6, s, l];
};

const hslToHex = ([h, s, l]) => {
    const hueToRgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + ((q - p) * 6 * t);
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + ((q - p) * ((2 / 3) - t) * 6);
        return p;
    };
    let rgb;
    if (s === 0) {
        rgb = [l, l, l];
    } else {
        const q = l < 0.5 ? l * (1 + s) : l + s - (l * s);
        const p = (2 * l) - q;
        rgb = [hueToRgb(p, q, h + (1 / 3)), hueToRgb(p, q, h), hueToRgb(p, q, h - (1 / 3))];
    }
    return `#${rgb.map(c => Math.round(c * 255).toString(16)
        .padStart(2, '0')).join('')}`;
};

const darken = (hex, amount) => {
    const [h, s, l] = rgbToHsl(hexToRgb(hex));
    return hslToHex([h, s, Math.max(0, l - amount)]);
};

/**
 * Build the full set of block colors from one main color, the same way Scratch's
 * category colors step down (My Blocks is #FF6680, #FF4D6A, #FF3355).
 * @param {string} primary Main color, as #RRGGBB.
 * @returns {Array.<string>} [primary, secondary, tertiary]
 */
const makeCustomBlockColor = primary => {
    const base = primary.slice(0, 7).toUpperCase();
    return [base, darken(base, 0.05).toUpperCase(), darken(base, 0.1).toUpperCase()];
};

/**
 * @param {?string} value The mutation's color attribute.
 * @returns {?Array.<string>} [primary, secondary, tertiary], or null for the default color.
 */
const parseColorAttribute = value => {
    if (!value) return null;
    let parsed;
    try {
        parsed = JSON.parse(value);
    } catch (e) {
        return null;
    }
    // Older PenguinMod projects stored an object
    if (parsed && !Array.isArray(parsed) && parsed.primary) {
        parsed = [parsed.primary, parsed.secondary, parsed.tertiary];
    }
    if (!Array.isArray(parsed) || parsed.length < 3) return null;
    const colors = parsed.slice(0, 3);
    if (!colors.every(color => typeof color === 'string' && HEX_PATTERN.test(color))) return null;
    return colors.map(color => color.slice(0, 7));
};

const relativeLuminance = hex => {
    const [r, g, b] = hexToRgb(hex).map(c => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
    return (0.2126 * r) + (0.7152 * g) + (0.0722 * b);
};

// White text like Scratch uses, unless the color is too light to read it on
const needsDarkText = hex => relativeLuminance(hex) > 0.65;

const getPrototypeOfDefinition = definition => {
    const input = definition.getInput('custom_block');
    return input && input.connection ? input.connection.targetBlock() : null;
};

/**
 * @param {Blockly.Block} block Any block.
 * @returns {?Array.<string>} The custom color this block should show, or null for the default.
 */
const getCustomColor = block => {
    if (MUTATION_TYPES.includes(block.type)) {
        return block.pebbleColor || null;
    }
    if (block.type === 'procedures_definition') {
        const prototype = getPrototypeOfDefinition(block);
        return prototype ? getCustomColor(prototype) : null;
    }
    if (CONTEXT_TYPES.includes(block.type)) {
        const parent = block.getParent();
        if (parent && parent.type === 'procedures_prototype') {
            return getCustomColor(parent);
        }
        const root = block.getRootBlock();
        if (root !== block && root.type === 'procedures_definition') {
            return getCustomColor(root);
        }
        // Not inside a definition: keep the color it was copied with
        return block.pebbleColor || null;
    }
    return null;
};

let installed = false;

/**
 * Teach scratch-blocks about custom block colors. Safe to call more than once.
 * @param {ScratchBlocks} ScratchBlocks The scratch-blocks instance used by the editor.
 */
const installCustomBlockColors = ScratchBlocks => {
    if (installed) return;
    installed = true;

    const repaint = block => {
        if (block && block.rendered && !block.isInsertionMarker()) {
            block.updateColour();
        }
    };

    // Everything colored by a definition: the hat, its prototype and argument/return blocks in it
    const repaintDefinition = definition => {
        repaint(definition);
        for (const block of definition.getDescendants(false)) {
            if (block === definition) continue;
            if (CONTEXT_TYPES.includes(block.type)) {
                // So it keeps the new color while being dragged out
                block.pebbleColor = getCustomColor(block);
                repaint(block);
            } else if (block.type === 'procedures_prototype') {
                repaint(block);
            }
        }
    };

    const colorMethods = {
        getColour () {
            const custom = getCustomColor(this);
            return custom ? custom[0] : this.colour_;
        },
        getColourSecondary () {
            const custom = getCustomColor(this);
            return custom ? custom[1] : this.colourSecondary_;
        },
        getColourTertiary () {
            const custom = getCustomColor(this);
            return custom ? custom[2] : this.colourTertiary_;
        },
        getColourQuaternary () {
            const custom = getCustomColor(this);
            return custom ? custom[2] : this.colourQuaternary_;
        },
        updateColour () {
            const custom = getCustomColor(this);
            const root = this.getSvgRoot();
            if (root) {
                const darkText = !!custom && needsDarkText(custom[0]);
                ScratchBlocks.utils[darkText ? 'addClass' : 'removeClass'](root, DARK_TEXT_CLASS);
                ScratchBlocks.utils[custom && !darkText ? 'addClass' : 'removeClass'](root, LIGHT_TEXT_CLASS);
            }
            // Looked up each time so addons that patch updateColour keep working
            ScratchBlocks.BlockSvg.prototype.updateColour.call(this);
            // Label boxes in the Make a Block editor only pick up their color when created
            for (const input of this.inputList) {
                for (const field of input.fieldRow) {
                    if (field.box_) field.box_.setAttribute('fill', this.getColourTertiary());
                }
            }
        }
    };

    for (const type of MUTATION_TYPES) {
        const definition = ScratchBlocks.Blocks[type];
        const originalMutationToDom = definition.mutationToDom;
        const originalDomToMutation = definition.domToMutation;
        Object.assign(definition, colorMethods, {
            mutationToDom (...args) {
                const mutation = originalMutationToDom.apply(this, args);
                if (mutation && this.pebbleColor) {
                    mutation.setAttribute(COLOR_ATTRIBUTE, JSON.stringify(this.pebbleColor));
                }
                return mutation;
            },
            domToMutation (xmlElement) {
                this.pebbleColor = parseColorAttribute(xmlElement.getAttribute(COLOR_ATTRIBUTE));
                originalDomToMutation.call(this, xmlElement);
                repaint(this);
                if (this.type === 'procedures_prototype') {
                    const parent = this.getParent();
                    if (parent && parent.type === 'procedures_definition') {
                        repaintDefinition(parent);
                    } else {
                        // Arguments get repainted with the definition once connected
                        for (const child of this.getChildren(false)) repaint(child);
                    }
                }
            },
            /**
             * Change the color, used by the Make a Block editor for its preview.
             * @param {?Array.<string>} color [primary, secondary, tertiary], or null for the default.
             */
            setCustomColor (color) {
                this.pebbleColor = color;
                repaint(this);
            },
            getCustomColor () {
                return this.pebbleColor || null;
            }
        });
    }

    Object.assign(ScratchBlocks.Blocks.procedures_definition, colorMethods);

    for (const type of CONTEXT_TYPES) {
        if (ScratchBlocks.Blocks[type]) {
            Object.assign(ScratchBlocks.Blocks[type], colorMethods);
        }
    }

    // Moving a script into or out of a definition changes the color of the arguments in it
    const originalSetParent = ScratchBlocks.BlockSvg.prototype.setParent;
    ScratchBlocks.BlockSvg.prototype.setParent = function (newParent) {
        originalSetParent.call(this, newParent);
        if (!this.rendered) return;
        for (const block of this.getDescendants(false)) {
            if (CONTEXT_TYPES.includes(block.type)) repaint(block);
        }
    };

    // Argument reporters remember their color so a copy dragged out of the define hat
    // keeps it, and so PenguinMod shows them in the right color
    for (const type of ARGUMENT_TYPES) {
        Object.assign(ScratchBlocks.Blocks[type], {
            mutationToDom () {
                const color = getCustomColor(this);
                if (!color) return null;
                const mutation = document.createElement('mutation');
                mutation.setAttribute(COLOR_ATTRIBUTE, JSON.stringify(color));
                return mutation;
            },
            domToMutation (xmlElement) {
                this.pebbleColor = parseColorAttribute(xmlElement.getAttribute(COLOR_ATTRIBUTE));
                repaint(this);
            }
        });
    }
};

export {
    CUSTOM_BLOCK_SWATCHES,
    DARK_TEXT_CLASS,
    LIGHT_TEXT_CLASS,
    installCustomBlockColors,
    makeCustomBlockColor,
    parseColorAttribute
};
