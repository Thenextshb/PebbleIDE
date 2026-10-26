import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';
import {defineMessages, FormattedMessage, intlShape, injectIntl} from 'react-intl';
import {openExtensionChooserModal} from '../reducers/modals';
import {
    getExtensionInfo,
    countExtensionBlocks,
    removeExtension,
    setReplaceTarget
} from '../lib/pebble-extensions';
import styles from '../components/pebble-extension-menu/extension-menu.css';

const messages = defineMessages({
    confirmRemove: {
        // eslint-disable-next-line max-len
        defaultMessage: '{name} is used by {count, plural, one {# block} other {# blocks}} in this project. Removing it will delete them. Remove it anyway?',
        description: 'Confirmation shown before removing an extension whose blocks are used in the project',
        id: 'pebble.extensionMenu.confirmRemove'
    }
});

const CATEGORY_ID_PREFIX = 'scratchCategoryId-';
const MENU_WIDTH = 200;
const MENU_HEIGHT = 110;

/**
 * Right-click menu on an extension's category in the block list, with Remove and Replace.
 */
class PebbleExtensionMenu extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleContextMenu',
            'handleDismiss',
            'handleKeyDown',
            'handleRemove',
            'handleReplace',
            'setMenuRef'
        ]);
        this.state = {
            extensionId: null,
            name: '',
            x: 0,
            y: 0
        };
    }
    componentDidMount () {
        document.addEventListener('contextmenu', this.handleContextMenu, true);
        document.addEventListener('mousedown', this.handleDismiss, true);
        document.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('blur', this.handleDismiss);
        window.addEventListener('resize', this.handleDismiss);
    }
    componentWillUnmount () {
        document.removeEventListener('contextmenu', this.handleContextMenu, true);
        document.removeEventListener('mousedown', this.handleDismiss, true);
        document.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('blur', this.handleDismiss);
        window.removeEventListener('resize', this.handleDismiss);
    }
    handleContextMenu (e) {
        const categoryItem = e.target.closest && e.target.closest('.scratchCategoryMenuItem');
        if (!categoryItem) return;
        const idClass = Array.from(categoryItem.classList).find(name => name.startsWith(CATEGORY_ID_PREFIX));
        const extensionId = idClass && idClass.substring(CATEGORY_ID_PREFIX.length);
        // Built-in categories like Motion aren't extensions and can't be removed
        const info = extensionId && getExtensionInfo(this.props.vm, extensionId);
        if (!info) return;
        e.preventDefault();
        e.stopPropagation();
        this.setState({
            extensionId,
            name: info.name,
            x: Math.min(e.clientX, window.innerWidth - MENU_WIDTH),
            y: Math.min(e.clientY, window.innerHeight - MENU_HEIGHT)
        });
    }
    handleDismiss (e) {
        if (e && e.target && this.menu && this.menu.contains(e.target)) return;
        if (this.state.extensionId !== null) {
            this.setState({extensionId: null});
        }
    }
    handleKeyDown (e) {
        if (e.key === 'Escape') {
            this.handleDismiss();
        }
    }
    handleRemove () {
        const {extensionId, name} = this.state;
        this.setState({extensionId: null});
        const count = countExtensionBlocks(this.props.vm, extensionId);
        // eslint-disable-next-line no-alert
        if (count > 0 && !confirm(this.props.intl.formatMessage(messages.confirmRemove, {name, count}))) {
            return;
        }
        removeExtension(this.props.vm, extensionId);
    }
    handleReplace () {
        setReplaceTarget(this.state.extensionId);
        this.setState({extensionId: null});
        this.props.onOpenExtensionChooser();
    }
    setMenuRef (menu) {
        this.menu = menu;
    }
    render () {
        if (this.state.extensionId === null) {
            return null;
        }
        return (
            <div
                className={styles.menu}
                ref={this.setMenuRef}
                role="menu"
                style={{
                    left: `${this.state.x}px`,
                    top: `${this.state.y}px`
                }}
            >
                <div className={styles.title}>{this.state.name}</div>
                <button
                    className={styles.item}
                    role="menuitem"
                    onClick={this.handleRemove}
                >
                    <FormattedMessage
                        defaultMessage="Remove extension"
                        description="Right-click menu item that removes an extension from the project"
                        id="pebble.extensionMenu.remove"
                    />
                </button>
                <button
                    className={styles.item}
                    role="menuitem"
                    onClick={this.handleReplace}
                >
                    <FormattedMessage
                        defaultMessage="Replace extension"
                        description="Right-click menu item that replaces an extension with another one"
                        id="pebble.extensionMenu.replace"
                    />
                </button>
            </div>
        );
    }
}

PebbleExtensionMenu.propTypes = {
    intl: intlShape,
    onOpenExtensionChooser: PropTypes.func.isRequired,
    vm: PropTypes.shape({
        runtime: PropTypes.object
    }).isRequired
};

const mapStateToProps = state => ({
    vm: state.scratchGui.vm
});

const mapDispatchToProps = dispatch => ({
    onOpenExtensionChooser: () => dispatch(openExtensionChooserModal())
});

export default injectIntl(connect(
    mapStateToProps,
    mapDispatchToProps
)(PebbleExtensionMenu));
