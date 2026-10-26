import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';

import DeleteButton from '../delete-button/delete-button.jsx';
import styles from './sprite-selector-item.css';
import {ContextMenuTrigger} from 'react-contextmenu';
import {DangerousMenuItem, ContextMenu, MenuItem} from '../context-menu/context-menu.jsx';
import {defineMessages, FormattedMessage, intlShape, injectIntl} from 'react-intl';

const messages = defineMessages({
    hideSprite: {
        defaultMessage: 'Hide sprite',
        description: 'Tooltip of the eye button in the sprite list that hides a showing sprite',
        id: 'pebble.spriteSelectorItem.hide'
    },
    showSprite: {
        defaultMessage: 'Show sprite',
        description: 'Tooltip of the eye button in the sprite list that shows a hidden sprite',
        id: 'pebble.spriteSelectorItem.show'
    }
});

// Keep a press on the eye button from starting a sprite drag
const stopPropagation = e => e.stopPropagation();

const VisibilityButton = injectIntl(({intl, visible, onClick}) => {
    const label = intl.formatMessage(visible ? messages.hideSprite : messages.showSprite);
    return (
        <button
            aria-label={label}
            className={styles.visibilityButton}
            title={label}
            onClick={onClick}
            onMouseDown={stopPropagation}
            onTouchStart={stopPropagation}
        >
            <svg
                aria-hidden="true"
                viewBox="0 0 16 16"
            >
                {visible ? (
                    <g
                        fill="currentColor"
                        transform="translate(1, 2)"
                    >
                        <path
                            // eslint-disable-next-line max-len
                            d="M13.5091295,4.36470987 C14.1505195,5.26785566 14.1765976,6.75321925 13.5091295,7.63529009 C13.5091295,7.63529009 11.4744401,11.5 6.99999999,11.5 C2.52555986,11.5 0.49087044,7.63529009 0.49087044,7.63529009 C-0.150519518,6.7321443 -0.176597571,5.24678071 0.49087044,4.36470987 C0.49087044,4.36470987 2.52555986,0.5 6.99999999,0.5 C11.4744401,0.5 13.5091295,4.36470987 13.5091295,4.36470987 Z M6.99889412,9.99889412 C9.2077277,9.99889412 10.9983412,8.20828068 10.9983412,5.99944706 C10.9983412,3.79061344 9.2077277,2 6.99889412,2 C4.7900605,2 2.99944706,3.79061344 2.99944706,5.99944706 C2.99944706,8.20828068 4.7900605,9.99889412 6.99889412,9.99889412 Z"
                        />
                        <circle
                            cx="7"
                            cy="6"
                            r="2"
                        />
                    </g>
                ) : (
                    <path
                        // eslint-disable-next-line max-len
                        d="M2.06675537,10.5669531 C0.999299947,9.6010063 0.49087044,8.63529009 0.49087044,8.63529009 C-0.150519518,7.7321443 -0.176597571,6.24678071 0.49087044,5.36470987 C0.49087044,5.36470987 2.52555986,1.5 6.99999999,1.5 C8.31672118,1.5 9.42216368,1.83467798 10.32665,2.30705842 L11.9737085,0.659999967 L12.6808152,1.36710675 L1.36710675,12.6808152 L0.659999967,11.9737085 L2.06675537,10.5669531 Z M9.06150447,3.57220396 C8.4592531,3.20897321 7.75347776,3 6.99889412,3 C4.7900605,3 2.99944706,4.79061344 2.99944706,6.99944706 C2.99944706,7.75403071 3.20842027,8.45980605 3.57165102,9.06205741 L5.07816645,7.55554198 C5.02727139,7.37916271 5,7.19276614 5,7 C5,5.8954305 5.8954305,5 7,5 C7.19276614,5 7.37916271,5.02727139 7.55554198,5.07816645 L9.06150447,3.57220396 Z M3.68757244,11.7003495 L4.95187601,10.4360459 C5.55070241,10.7935069 6.25081289,10.9988941 6.99889412,10.9988941 C9.2077277,10.9988941 10.9983412,9.20828068 10.9983412,6.99944706 C10.9983412,6.25136583 10.792954,5.55125535 10.435493,4.95242895 L11.9445897,3.44333221 C13.0043028,4.40583676 13.5091295,5.36470987 13.5091295,5.36470987 C14.1505195,6.26785566 14.1765976,7.75321925 13.5091295,8.63529009 C13.5091295,8.63529009 11.4744401,12.5 6.99999999,12.5 C5.69017232,12.5 4.58941688,12.1688172 3.68757244,11.7003495 Z M6.46130696,8.92661494 L8.92661494,6.46130696 C8.9744347,6.63269299 9,6.81336095 9,7 C9,8.1045695 8.1045695,9 7,9 C6.81336095,9 6.63269299,8.9744347 6.46130696,8.92661494 Z"
                        fill="currentColor"
                        transform="translate(1, 1)"
                    />
                )}
            </svg>
        </button>
    );
});

VisibilityButton.propTypes = {
    intl: intlShape,
    visible: PropTypes.bool,
    onClick: PropTypes.func.isRequired
};

// react-contextmenu requires unique id to match trigger and context menu
let contextMenuId = 0;

const SpriteSelectorItem = props => (
    <ContextMenuTrigger
        attributes={{
            className: classNames(props.className, styles.spriteSelectorItem, {
                [styles.isSelected]: props.selected,
                [styles.listItem]: props.listView,
                [styles.spriteHidden]: props.listView && props.visible === false
            }),
            onClick: props.onClick,
            onMouseEnter: props.onMouseEnter,
            onMouseLeave: props.onMouseLeave,
            onMouseDown: props.onMouseDown,
            onTouchStart: props.onMouseDown
        }}
        disable={props.preventContextMenu}
        id={`${props.name}-${contextMenuId}`}
        ref={props.componentRef}
    >
        {typeof props.number === 'undefined' ? null : (
            <div className={styles.number}>{props.number}</div>
        )}
        {props.costumeURL ? (
            <div className={styles.spriteImageOuter}>
                <div className={styles.spriteImageInner}>
                    <img
                        className={styles.spriteImage}
                        draggable={false}
                        loading="lazy"
                        src={props.costumeURL}
                    />
                </div>
            </div>
        ) : null}
        <div className={styles.spriteInfo}>
            <div className={styles.spriteName}>{props.name}</div>
            {props.details ? (
                <div className={styles.spriteDetails}>{props.details}</div>
            ) : null}
        </div>
        {(props.selected && props.onDeleteButtonClick) ? (
            <DeleteButton
                className={styles.deleteButton}
                onClick={props.onDeleteButtonClick}
            />
        ) : null }
        {props.onToggleVisible ? (
            <VisibilityButton
                visible={props.visible}
                onClick={props.onToggleVisible}
            />
        ) : null}
        {props.onDuplicateButtonClick || props.onDeleteButtonClick || props.onExportButtonClick ? (
            <ContextMenu id={`${props.name}-${contextMenuId++}`}>
                {props.onDuplicateButtonClick ? (
                    <MenuItem onClick={props.onDuplicateButtonClick}>
                        <FormattedMessage
                            defaultMessage="duplicate"
                            description="Menu item to duplicate in the right click menu"
                            id="gui.spriteSelectorItem.contextMenuDuplicate"
                        />
                    </MenuItem>
                ) : null}
                {props.onExportButtonClick ? (
                    <MenuItem onClick={props.onExportButtonClick}>
                        <FormattedMessage
                            defaultMessage="export"
                            description="Menu item to export the selected item"
                            id="gui.spriteSelectorItem.contextMenuExport"
                        />
                    </MenuItem>
                ) : null }
                {props.onRenameButtonClick ? (
                    <MenuItem onClick={props.onRenameButtonClick}>
                        <FormattedMessage
                            defaultMessage="rename"
                            description="Menu item to rename an item"
                            id="tw.spriteSelectorItem.rename"
                        />
                    </MenuItem>
                ) : null}
                {props.onDeleteButtonClick ? (
                    <DangerousMenuItem onClick={props.onDeleteButtonClick}>
                        <FormattedMessage
                            defaultMessage="delete"
                            description="Menu item to delete in the right click menu"
                            id="gui.spriteSelectorItem.contextMenuDelete"
                        />
                    </DangerousMenuItem>
                ) : null }
            </ContextMenu>
        ) : null}
    </ContextMenuTrigger>
);

SpriteSelectorItem.propTypes = {
    className: PropTypes.string,
    componentRef: PropTypes.func,
    costumeURL: PropTypes.string,
    details: PropTypes.string,
    listView: PropTypes.bool,
    // eslint-disable-next-line react/forbid-prop-types
    name: PropTypes.any,
    number: PropTypes.number,
    onClick: PropTypes.func,
    onDeleteButtonClick: PropTypes.func,
    onDuplicateButtonClick: PropTypes.func,
    onExportButtonClick: PropTypes.func,
    onRenameButtonClick: PropTypes.func,
    onToggleVisible: PropTypes.func,
    onMouseDown: PropTypes.func,
    onMouseEnter: PropTypes.func,
    onMouseLeave: PropTypes.func,
    preventContextMenu: PropTypes.bool,
    selected: PropTypes.bool.isRequired,
    visible: PropTypes.bool
};

export default SpriteSelectorItem;
