import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';
import {FormattedMessage, defineMessages} from 'react-intl';
import {connect} from 'react-redux';

import check from './check.svg';
import dropdownCaret from './dropdown-caret.svg';
import {MenuItem, Submenu} from '../menu/menu.jsx';
import {GUI_DARK, GUI_GREY, GUI_LIGHT, GUI_MAP, Theme} from '../../lib/themes/index.js';
import {openGuiThemeMenu, guiThemeMenuOpen, closeSettingsMenu} from '../../reducers/menus.js';
import {setTheme} from '../../reducers/theme.js';
import {persistTheme} from '../../lib/themes/themePersistance.js';
import lightModeIcon from './tw-sun.svg';
import darkModeIcon from './tw-moon.svg';
import styles from './settings-menu.css';

const options = defineMessages({
    [GUI_GREY]: {
        defaultMessage: 'Grey',
        description: 'Name of the grey interface mode, used by PebbleIDE by default.',
        id: 'pebble.gui.grey'
    },
    [GUI_LIGHT]: {
        defaultMessage: 'Light',
        description: 'Name of the light interface mode.',
        id: 'pebble.gui.light'
    },
    [GUI_DARK]: {
        defaultMessage: 'Dark',
        description: 'Name of the dark interface mode.',
        id: 'pebble.gui.dark'
    }
});

const icons = {
    [GUI_LIGHT]: lightModeIcon,
    [GUI_DARK]: darkModeIcon
};

const ModeIcon = props => (
    icons[props.id] ? (
        <img
            className={styles.accentIconOuter}
            src={icons[props.id]}
            draggable={false}
            // Image is decorative
            alt=""
        />
    ) : (
        <div
            className={styles.accentIconOuter}
            style={{
                backgroundColor: GUI_MAP[props.id].guiColors['ui-tertiary']
            }}
        />
    )
);

ModeIcon.propTypes = {
    id: PropTypes.string
};

const GuiMenuItem = props => (
    <MenuItem onClick={props.onClick}>
        <div className={styles.option}>
            <img
                className={classNames(styles.check, {[styles.selected]: props.isSelected})}
                width={15}
                height={12}
                src={check}
                draggable={false}
            />
            <ModeIcon id={props.id} />
            <FormattedMessage {...options[props.id]} />
        </div>
    </MenuItem>
);

GuiMenuItem.propTypes = {
    id: PropTypes.string,
    isSelected: PropTypes.bool,
    onClick: PropTypes.func
};

const GuiThemeMenu = ({
    isOpen,
    isRtl,
    onChangeTheme,
    onOpen,
    theme
}) => (
    <MenuItem expanded={isOpen}>
        <div
            className={styles.option}
            onClick={onOpen}
        >
            <ModeIcon id={theme.gui} />
            <span className={styles.submenuLabel}>
                <FormattedMessage
                    defaultMessage="Mode"
                    description="Label for menu to choose the interface mode (grey, light or dark)"
                    id="pebble.menuBar.mode"
                />
            </span>
            <img
                className={styles.expandCaret}
                src={dropdownCaret}
                draggable={false}
            />
        </div>
        <Submenu place={isRtl ? 'left' : 'right'}>
            {Object.keys(options).map(item => (
                <GuiMenuItem
                    key={item}
                    id={item}
                    isSelected={theme.gui === item}
                    // eslint-disable-next-line react/jsx-no-bind
                    onClick={() => onChangeTheme(theme.set('gui', item))}
                />
            ))}
        </Submenu>
    </MenuItem>
);

GuiThemeMenu.propTypes = {
    isOpen: PropTypes.bool,
    isRtl: PropTypes.bool,
    onChangeTheme: PropTypes.func,
    onOpen: PropTypes.func,
    theme: PropTypes.instanceOf(Theme)
};

const mapStateToProps = state => ({
    isOpen: guiThemeMenuOpen(state),
    isRtl: state.locales.isRtl,
    theme: state.scratchGui.theme.theme
});

const mapDispatchToProps = dispatch => ({
    onChangeTheme: theme => {
        dispatch(setTheme(theme));
        dispatch(closeSettingsMenu());
        persistTheme(theme);
    },
    onOpen: () => dispatch(openGuiThemeMenu())
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(GuiThemeMenu);
