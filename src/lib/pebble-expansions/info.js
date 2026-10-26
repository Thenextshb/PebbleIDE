/**
 * Which toolbox category each built-in PenguinMod expansion joins, plus helpers for the
 * toolbox and block colors. Kept free of VM code so the toolbox can use it cheaply.
 */

// `category` is the toolbox category the blocks join, `colors` the theme's color set for it
const EXPANSIONS = [
    {id: 'pmMotionExpansion', category: 'motion', colors: 'motion'},
    {id: 'pmEventsExpansion', category: 'events', colors: 'event'},
    {id: 'pmControlsExpansion', category: 'control', colors: 'control'},
    {id: 'pmSensingExpansion', category: 'sensing', colors: 'sensing'},
    {id: 'pmOperatorsExpansion', category: 'operators', colors: 'operators'}
];

const EXPANSION_IDS = EXPANSIONS.map(expansion => expansion.id);

const isExpansion = id => EXPANSION_IDS.includes(id);

/**
 * Give an expansion block the colors of the category it's shown in.
 * @param {string} extensionId The block's extension.
 * @param {object} blockJson scratch-blocks definition.
 * @param {object} blockColors The theme's block colors.
 * @returns {?object} The recolored definition, or null if the block isn't from an expansion.
 */
const colorExpansionBlock = (extensionId, blockJson, blockColors) => {
    const expansion = EXPANSIONS.find(item => item.id === extensionId);
    if (!expansion || !blockJson) return null;
    const colors = blockColors[expansion.colors];
    if (!colors) return null;
    return {
        ...blockJson,
        colour: colors.primary,
        colourSecondary: colors.secondary,
        colourTertiary: colors.tertiary,
        colourQuaternary: colors.quaternary || colors.tertiary
    };
};

const CATEGORY_OPEN = /^\s*<category\b[^>]*>/;
const CATEGORY_CLOSE = '</category>';

/**
 * Take the expansions out of the extension category list.
 * @param {Array.<{id: string, xml: string}>} categoriesXML Extension categories from the VM.
 * @returns {{categoriesXML: Array, blocks: object.<string, string>}} The other categories, and the
 *     expansion blocks' XML for each toolbox category.
 */
const takeExpansionBlocks = categoriesXML => {
    const blocks = {};
    const rest = [];
    for (const category of categoriesXML) {
        const expansion = EXPANSIONS.find(item => item.id === category.id);
        if (!expansion) {
            rest.push(category);
            continue;
        }
        const open = category.xml.match(CATEGORY_OPEN);
        const end = category.xml.lastIndexOf(CATEGORY_CLOSE);
        if (!open || end === -1) continue;
        blocks[expansion.category] = category.xml.substring(open[0].length, end);
    }
    return {categoriesXML: rest, blocks};
};

/**
 * @param {string} categoryXML A toolbox category.
 * @param {?string} extraXML Blocks to add at the end of it.
 * @returns {string} The category with the blocks added.
 */
const appendToCategory = (categoryXML, extraXML) => {
    if (!extraXML || !extraXML.trim()) return categoryXML;
    const end = categoryXML.lastIndexOf(CATEGORY_CLOSE);
    if (end === -1) return categoryXML;
    return `${categoryXML.substring(0, end)}<sep gap="36"/>${extraXML}${categoryXML.substring(end)}`;
};

export {
    EXPANSION_IDS,
    appendToCategory,
    colorExpansionBlock,
    isExpansion,
    takeExpansionBlocks
};
