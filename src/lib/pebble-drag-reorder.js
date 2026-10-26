import bindAll from 'lodash.bindall';

// How long an item has to be held down before it can be moved with a finger
const HOLD_TIME = 300;
// A mouse can start moving an item right away once it moves this far
const MOUSE_DRAG_DISTANCE = 5;
// A finger that moves this far before the hold time is up is scrolling, not moving an item
const TOUCH_SCROLL_DISTANCE = 10;
const LIFT_SCALE = 1.06;

const stopEvent = e => {
    e.stopPropagation();
    e.preventDefault();
};

// Letting go of a moved item shouldn't also count as clicking it
const swallowClick = () => {
    const types = ['mouseup', 'touchend', 'click'];
    for (const type of types) window.addEventListener(type, stopEvent, true);
    setTimeout(() => {
        for (const type of types) window.removeEventListener(type, stopEvent, true);
    }, 300);
};

class Reorder {
    constructor (event, {items, index, axis, onMove}) {
        bindAll(this, [
            'lift',
            'handlePointerMove',
            'handlePointerUp',
            'handlePointerCancel',
            'handleTouchMove',
            'handleContextMenu'
        ]);
        this.pointerId = event.pointerId;
        this.isMouse = event.pointerType === 'mouse';
        this.startX = event.clientX;
        this.startY = event.clientY;
        this.items = items;
        this.index = index;
        this.target = index;
        this.axis = axis;
        this.onMove = onMove;
        this.lifted = false;
        this.dragged = false;
        this.delta = 0;
        this.savedStyles = items.map(item => item.getAttribute('style'));

        this.holdTimeout = setTimeout(this.lift, HOLD_TIME);
        window.addEventListener('pointermove', this.handlePointerMove);
        window.addEventListener('pointerup', this.handlePointerUp);
        window.addEventListener('pointercancel', this.handlePointerCancel);
        // Not passive, so the page doesn't scroll while a finger moves an item
        window.addEventListener('touchmove', this.handleTouchMove, {passive: false});
        window.addEventListener('contextmenu', this.handleContextMenu);
    }

    lift () {
        clearTimeout(this.holdTimeout);
        const rects = this.items.map(item => {
            const rect = item.getBoundingClientRect();
            return this.axis === 'x' ? {start: rect.left, end: rect.right} : {start: rect.top, end: rect.bottom};
        });
        // Right-to-left languages list the items backwards
        const sign = rects[rects.length - 1].start < rects[0].start ? -1 : 1;
        // Only a plain row or column can be reordered (the "columns" addon puts categories in a grid)
        for (let i = 1; i < rects.length; i++) {
            if (sign * (rects[i].start - rects[i - 1].start) <= 0) {
                this.finish(false);
                return;
            }
        }
        const [first, second] = sign > 0 ? [rects[0], rects[1]] : [rects[1], rects[0]];
        const pressed = rects[this.index];
        this.rects = rects;
        this.sign = sign;
        // How far the other items slide to make room
        this.slot = (pressed.end - pressed.start) + (second.start - first.end);
        this.min = Math.min(...rects.map(rect => rect.start)) - pressed.start;
        this.max = Math.max(...rects.map(rect => rect.end)) - pressed.end;
        this.lifted = true;

        this.items.forEach((item, i) => {
            if (i === this.index) {
                item.style.position = 'relative';
                item.style.zIndex = '10';
                item.style.cursor = 'grabbing';
            } else {
                item.style.transition = 'transform 0.15s ease';
            }
        });
        this.update();
    }

    update () {
        // The item stays inside the list, but the pointer can go past the ends to pick the first or last spot
        const delta = Math.max(this.min, Math.min(this.max, this.delta));
        const pressed = this.rects[this.index];
        const middle = ((pressed.start + pressed.end) / 2) + this.delta;
        this.target = this.rects.filter((rect, i) => (
            i !== this.index && this.sign * (rect.start + rect.end) / 2 < this.sign * middle
        )).length;

        const translate = this.axis === 'x' ? 'translateX' : 'translateY';
        this.items.forEach((item, i) => {
            let offset = 0;
            if (i === this.index) {
                item.style.transform = `${translate}(${delta}px) scale(${LIFT_SCALE})`;
                return;
            } else if (i > this.index && i <= this.target) {
                offset = -this.sign * this.slot;
            } else if (i < this.index && i >= this.target) {
                offset = this.sign * this.slot;
            }
            item.style.transform = offset ? `${translate}(${offset}px)` : '';
        });
    }

    handlePointerMove (e) {
        if (e.pointerId !== this.pointerId) return;
        const distance = Math.hypot(e.clientX - this.startX, e.clientY - this.startY);
        if (!this.lifted) {
            if (this.isMouse && distance >= MOUSE_DRAG_DISTANCE) {
                this.lift();
                if (!this.lifted) return;
            } else {
                if (!this.isMouse && distance >= TOUCH_SCROLL_DISTANCE) this.finish(false);
                return;
            }
        }
        if (distance >= MOUSE_DRAG_DISTANCE) this.dragged = true;
        this.delta = this.axis === 'x' ? e.clientX - this.startX : e.clientY - this.startY;
        this.update();
    }

    handlePointerUp (e) {
        if (e.pointerId === this.pointerId) this.finish(true);
    }

    handlePointerCancel (e) {
        if (e.pointerId === this.pointerId) this.finish(false);
    }

    handleTouchMove (e) {
        if (this.lifted) e.preventDefault();
    }

    handleContextMenu (e) {
        // A long press with a finger opens the context menu
        e.preventDefault();
    }

    finish (drop) {
        clearTimeout(this.holdTimeout);
        window.removeEventListener('pointermove', this.handlePointerMove);
        window.removeEventListener('pointerup', this.handlePointerUp);
        window.removeEventListener('pointercancel', this.handlePointerCancel);
        window.removeEventListener('touchmove', this.handleTouchMove, {passive: false});
        window.removeEventListener('contextmenu', this.handleContextMenu);
        if (!this.lifted) return;
        this.lifted = false;
        // onMove puts the items in their new order before they snap back into place
        if (drop && this.target !== this.index) this.onMove(this.index, this.target);
        this.items.forEach((item, i) => {
            if (this.savedStyles[i] === null) item.removeAttribute('style');
            else item.setAttribute('style', this.savedStyles[i]);
        });
        if (drop && this.dragged) swallowClick();
    }
}

/**
 * Let one item in a row or column be moved to a new spot by holding it down (or dragging it with a mouse).
 * The items only slide around on screen while it's being moved; onMove has to put them in their new order.
 * @param {PointerEvent} event The pointerdown event on the item.
 * @param {object} options Options.
 * @param {HTMLElement[]} options.items Every item in the list, in list order.
 * @param {number} options.index Index of the item that was pressed.
 * @param {string} options.axis "x" for a row, "y" for a column.
 * @param {function(number, number)} options.onMove Called with the old and new index of a moved item.
 */
const startReorder = (event, options) => {
    if (!event.isPrimary || event.button !== 0 || options.items.length < 2 || options.index < 0) return;
    // eslint-disable-next-line no-new
    new Reorder(event, options);
};

/**
 * Move one entry of an array to a new index.
 * @param {Array} array The array.
 * @param {number} from Old index.
 * @param {number} to New index.
 * @returns {Array} A new array.
 */
const moveItem = (array, from, to) => {
    const result = array.slice();
    result.splice(to, 0, result.splice(from, 1)[0]);
    return result;
};

export {
    startReorder,
    moveItem
};
