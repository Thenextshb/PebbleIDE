// The order of the block categories, which can be changed by dragging them.
// The built-in categories keep their order between visits; extensions keep theirs until the page is closed.

const STORAGE_KEY = 'pebble:categoryOrder';
const BUILT_IN_CATEGORIES = [
    'motion',
    'looks',
    'sound',
    'events',
    'control',
    'sensing',
    'operators',
    'variables',
    'myBlocks'
];

const loadOrder = () => {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
        if (Array.isArray(saved)) {
            return saved.filter(id => BUILT_IN_CATEGORIES.includes(id));
        }
    } catch (e) {
        // ignore
    }
    return [];
};

let order = loadOrder();

/**
 * @param {string[]} ids Every category ID in its new order.
 */
const setCategoryOrder = ids => {
    order = ids.slice();
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(ids.filter(id => BUILT_IN_CATEGORIES.includes(id))));
    } catch (e) {
        // ignore
    }
};

/**
 * @param {Array.<{id: string}>} categories Categories in the default order.
 * @returns {Array.<{id: string}>} The categories in the order the user picked. Ones that haven't been
 * moved yet, like a newly added extension, go at the end.
 */
const sortCategories = categories => {
    const positions = new Map(order.map((id, index) => [id, index]));
    const placed = categories
        .filter(category => positions.has(category.id))
        .sort((a, b) => positions.get(a.id) - positions.get(b.id));
    return placed.concat(categories.filter(category => !positions.has(category.id)));
};

export {
    setCategoryOrder,
    sortCategories
};
