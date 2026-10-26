import styles from './style.css';
import {getDefaultButtonLabel} from '../common/touch-control-keys';

// Scratch key names to the KeyboardEvent.key values the VM understands.
// Single characters (letters, numbers) are passed through unchanged.
const KEY_VALUES = {
  'space': ' ',
  'up arrow': 'ArrowUp',
  'down arrow': 'ArrowDown',
  'left arrow': 'ArrowLeft',
  'right arrow': 'ArrowRight',
  'enter': 'Enter',
  'backspace': 'Backspace',
  'delete': 'Delete',
  'shift': 'Shift',
  'caps lock': 'CapsLock',
  'scroll lock': 'ScrollLock',
  'control': 'Control',
  'escape': 'Escape',
  'insert': 'Insert',
  'home': 'Home',
  'end': 'End',
  'page up': 'PageUp',
  'page down': 'PageDown'
};

const KEY_CODES = {
  ' ': 32,
  'ArrowLeft': 37,
  'ArrowUp': 38,
  'ArrowRight': 39,
  'ArrowDown': 40,
  'Enter': 13,
  'Backspace': 8,
  'Delete': 46,
  'Shift': 16,
  'Control': 17,
  'Escape': 27
};

const DPAD_KEYS = {
  arrows: {
    up: 'up arrow',
    down: 'down arrow',
    left: 'left arrow',
    right: 'right arrow'
  },
  wasd: {
    up: 'w',
    down: 's',
    left: 'a',
    right: 'd'
  }
};

const SIZES = {
  small: 0.8,
  medium: 1,
  large: 1.25
};

// The d-pad is split into 8 slices around its center, starting at "right" and going clockwise.
const DPAD_SLICES = [
  ['right'],
  ['right', 'down'],
  ['down'],
  ['down', 'left'],
  ['left'],
  ['left', 'up'],
  ['up'],
  ['up', 'right']
];
const DPAD_DEADZONE = 0.2;

const ARROW_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5l8 10H4z"/></svg>';

const toKeyValue = (scratchKey) => KEY_VALUES[scratchKey] || scratchKey;

// Keeps receiving a finger's events even if it slides off the control. Losing this only makes
// the controls slightly less forgiving, so failures are ignored.
const capturePointer = (element, pointerId) => {
  try {
    element.setPointerCapture(pointerId);
  } catch (e) {
    // ignore
  }
};

const toKeyCode = (key) => {
  if (Object.prototype.hasOwnProperty.call(KEY_CODES, key)) {
    return KEY_CODES[key];
  }
  return key.length === 1 ? key.toUpperCase().charCodeAt(0) : 0;
};

const isTouchScreen = () => (
  (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) ||
  navigator.maxTouchPoints > 1
);

class TouchControls {
  /**
   * @param {import('./scaffolding').Scaffolding} scaffolding
   * @param {{show: 'touch'|'always', dpad: 'arrows'|'wasd'|'none', size: string, buttons: {key: string, label: string}[]}} options
   */
  constructor (scaffolding, options) {
    this.scaffolding = scaffolding;

    // Scratch key -> number of controls currently holding it down
    this._held = new Map();

    this.root = document.createElement('div');
    this.root.className = styles.touchControls;
    this.root.style.setProperty('--sc-touch-scale', SIZES[options.size] || 1);

    // Touches on the controls must not also move or click the Scratch mouse.
    for (const type of ['touchstart', 'touchmove', 'touchend', 'mousedown', 'mousemove', 'mouseup']) {
      this.root.addEventListener(type, (e) => {
        e.stopPropagation();
        if (type === 'touchstart' && e.cancelable) {
          e.preventDefault();
        }
      }, {passive: false});
    }

    if (options.dpad && DPAD_KEYS[options.dpad]) {
      this._createDpad(DPAD_KEYS[options.dpad]);
    }

    const buttons = (options.buttons || []).filter((button) => button && button.key);
    if (buttons.length) {
      this._buttons = document.createElement('div');
      this._buttons.className = styles.touchButtons;
      for (const button of buttons) {
        this._createButton(button);
      }
      this.root.appendChild(this._buttons);
    }

    if (options.show === 'always' || isTouchScreen()) {
      this.show();
    } else {
      this.hide();
      // Laptops with touch screens: show the controls once someone actually touches the screen.
      document.addEventListener('touchstart', () => this.show(), {once: true, passive: true});
    }

    // The controls would cover the "ask and wait" answer box, so hide them while a question is open.
    scaffolding.vm.runtime.on('QUESTION', (question) => {
      this.root.classList.toggle(styles.touchControlsAsking, question !== null);
    });

    // Releasing everything when the page loses focus prevents keys getting stuck down.
    window.addEventListener('blur', () => this.releaseAll());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.releaseAll();
    });
  }

  show () {
    this.root.hidden = false;
  }

  hide () {
    this.root.hidden = true;
  }

  _post (scratchKey, isDown) {
    const key = toKeyValue(scratchKey);
    this.scaffolding.vm.postIOData('keyboard', {
      key,
      keyCode: toKeyCode(key),
      isDown
    });
  }

  press (scratchKey) {
    const count = this._held.get(scratchKey) || 0;
    this._held.set(scratchKey, count + 1);
    if (count === 0) {
      this._post(scratchKey, true);
    }
  }

  release (scratchKey) {
    const count = this._held.get(scratchKey) || 0;
    if (count <= 1) {
      this._held.delete(scratchKey);
      if (count === 1) {
        this._post(scratchKey, false);
      }
    } else {
      this._held.set(scratchKey, count - 1);
    }
  }

  releaseAll () {
    for (const scratchKey of this._held.keys()) {
      this._post(scratchKey, false);
    }
    this._held.clear();
    if (this._setDpadDirections) {
      this._setDpadDirections([]);
    }
    for (const element of this.root.querySelectorAll(`.${styles.touchActive}`)) {
      element.classList.remove(styles.touchActive);
    }
  }

  _createDpad (keys) {
    const dpad = document.createElement('div');
    dpad.className = styles.touchDpad;

    const arrows = {};
    for (const direction of ['up', 'right', 'down', 'left']) {
      const arrow = document.createElement('div');
      arrow.className = `${styles.touchDpadArrow} ${styles[`touchDpad${direction[0].toUpperCase()}${direction.slice(1)}`]}`;
      arrow.innerHTML = ARROW_SVG;
      dpad.appendChild(arrow);
      arrows[direction] = arrow;
    }

    const held = new Set();
    this._setDpadDirections = (directions) => {
      for (const direction of Object.keys(arrows)) {
        const shouldHold = directions.includes(direction);
        if (shouldHold && !held.has(direction)) {
          held.add(direction);
          this.press(keys[direction]);
        } else if (!shouldHold && held.has(direction)) {
          held.delete(direction);
          this.release(keys[direction]);
        }
        arrows[direction].classList.toggle(styles.touchActive, shouldHold);
      }
    };

    let activePointer = null;
    const update = (e) => {
      const rect = dpad.getBoundingClientRect();
      const radius = rect.width / 2;
      const dx = (e.clientX - (rect.left + radius)) / radius;
      const dy = (e.clientY - (rect.top + radius)) / radius;
      if (Math.sqrt((dx * dx) + (dy * dy)) < DPAD_DEADZONE) {
        this._setDpadDirections([]);
        return;
      }
      const slice = Math.round(Math.atan2(dy, dx) / (Math.PI / 4));
      this._setDpadDirections(DPAD_SLICES[((slice % 8) + 8) % 8]);
    };
    const end = (e) => {
      if (e.pointerId !== activePointer) return;
      activePointer = null;
      this._setDpadDirections([]);
    };

    dpad.addEventListener('pointerdown', (e) => {
      if (activePointer !== null) return;
      e.preventDefault();
      activePointer = e.pointerId;
      capturePointer(dpad, e.pointerId);
      update(e);
    });
    dpad.addEventListener('pointermove', (e) => {
      if (e.pointerId === activePointer) update(e);
    });
    dpad.addEventListener('pointerup', end);
    dpad.addEventListener('pointercancel', end);
    dpad.addEventListener('lostpointercapture', end);
    dpad.addEventListener('contextmenu', (e) => e.preventDefault());

    this.root.appendChild(dpad);
  }

  _createButton ({key, label}) {
    const button = document.createElement('div');
    button.className = styles.touchButton;
    const text = label || getDefaultButtonLabel(key);
    button.textContent = text;
    if (text.length > 2) {
      button.classList.add(styles.touchButtonSmallText);
    }

    const pointers = new Set();
    const end = (e) => {
      if (!pointers.delete(e.pointerId)) return;
      if (pointers.size === 0) {
        button.classList.remove(styles.touchActive);
        this.release(key);
      }
    };
    button.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      capturePointer(button, e.pointerId);
      pointers.add(e.pointerId);
      if (pointers.size === 1) {
        button.classList.add(styles.touchActive);
        this.press(key);
      }
    });
    button.addEventListener('pointerup', end);
    button.addEventListener('pointercancel', end);
    button.addEventListener('lostpointercapture', end);
    button.addEventListener('contextmenu', (e) => e.preventDefault());

    this._buttons.appendChild(button);
  }
}

export default TouchControls;
