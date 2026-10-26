// Shared by the packager interface and the touch controls in packaged projects.

const BUTTON_LABELS = {
  'space': 'Space',
  'up arrow': '▲',
  'down arrow': '▼',
  'left arrow': '◀',
  'right arrow': '▶',
  'enter': 'Enter',
  'shift': 'Shift',
  'control': 'Ctrl',
  'escape': 'Esc',
  'backspace': '⌫'
};

/**
 * @param {string} scratchKey Scratch key name, for example 'space' or 'z'
 * @returns {string} Text shown on a touch button for that key
 */
export const getDefaultButtonLabel = (scratchKey) => (
  BUTTON_LABELS[scratchKey] || scratchKey.toUpperCase()
);

export const ARROW_KEYS = ['up arrow', 'down arrow', 'left arrow', 'right arrow'];
export const WASD_KEYS = ['w', 'a', 's', 'd'];

/** Keys offered for touch buttons in the packager interface */
export const BUTTON_KEY_CHOICES = [
  'space',
  'enter',
  ...ARROW_KEYS,
  'shift',
  'control',
  'escape',
  'backspace',
  ...'abcdefghijklmnopqrstuvwxyz'.split(''),
  ...'0123456789'.split('')
];
