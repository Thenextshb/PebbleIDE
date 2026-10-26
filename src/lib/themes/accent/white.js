// White buttons and highlights with dark icons and text on them.
// White can't be seen on the light mode background, so light mode uses the grey accent instead.
import {guiColors, blockColors} from './grey';

const darkGuiColors = {
    'motion-primary': '#ffffff',
    'motion-primary-transparent': '#ffffffe6',
    'motion-tertiary': '#cccccc',

    'looks-secondary': '#ffffff',
    'looks-transparent': '#ffffff59',
    'looks-light-transparent': '#ffffff26',
    'looks-secondary-dark': '#d9d9d9',

    'drop-highlight': '#ffffff',

    'accent-foreground': '#333333',
    'accent-icon-filter': 'brightness(0.2)',
    'accent-behind-white': '#7d7d7d'
};

export {
    guiColors,
    darkGuiColors,
    blockColors
};
