import classNames from 'classnames';
import {defineMessages, injectIntl, intlShape} from 'react-intl';
import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';
import VM from 'scratch-vm';

import Box from '../box/box.jsx';
import Button from '../button/button.jsx';
import ToggleButtons from '../toggle-buttons/toggle-buttons.jsx';
import Controls from '../../containers/controls.jsx';
import {getStageDimensions, getMinWidth} from '../../lib/screen-utils';
import {STAGE_DISPLAY_SIZES, STAGE_SIZE_MODES} from '../../lib/layout-constants';

import fullScreenIcon from './icon--fullscreen.svg';
import unFullScreenIcon from './icon--unfullscreen.svg';
import largeStageIcon from '!../../lib/tw-recolor/build!./icon--large-stage.svg';
import smallStageIcon from '!../../lib/tw-recolor/build!./icon--small-stage.svg';
import fullStageIcon from '!../../lib/tw-recolor/build!./icon--full-stage.svg';
import spriteListIcon from '!../../lib/tw-recolor/build!./icon--sprite-list.svg';
import settingsIcon from './icon--settings.svg';

import ThumbnailButton from '../pebble-projects/thumbnail-button.jsx';
import styles from './stage-header.css';

import FullscreenAPI from '../../lib/tw-fullscreen-api';
import {setSpriteListView} from '../../reducers/tw';

const messages = defineMessages({
    largeStageSizeMessage: {
        defaultMessage: 'Switch to large stage',
        description: 'Button to change stage size to large',
        id: 'gui.stageHeader.stageSizeLarge'
    },
    smallStageSizeMessage: {
        defaultMessage: 'Switch to small stage',
        description: 'Button to change stage size to small',
        id: 'gui.stageHeader.stageSizeSmall'
    },
    fullStageSizeMessage: {
        defaultMessage: 'Switch to full stage',
        description: 'Button to change stage size to its full size',
        id: 'tw.stageHeader.full'
    },
    fullScreenMessage: {
        defaultMessage: 'Enter full screen mode',
        description: 'Button to change stage size to full screen',
        id: 'gui.stageHeader.stageSizeFull'
    },
    unFullScreenMessage: {
        defaultMessage: 'Exit full screen mode',
        description: 'Button to get out of full screen mode',
        id: 'gui.stageHeader.stageSizeUnFull'
    },
    fullscreenControl: {
        defaultMessage: 'Full Screen Control',
        description: 'Button to enter/exit full screen mode',
        id: 'gui.stageHeader.fullscreenControl'
    },
    spriteListMessage: {
        defaultMessage: 'Show sprites as a list',
        description: 'Button above the stage that shows the sprite list as rows instead of a grid',
        id: 'pebble.stageHeader.spriteList'
    },
    spriteGridMessage: {
        defaultMessage: 'Show sprites as a grid',
        description: 'Button above the stage that shows the sprite list as a grid instead of rows',
        id: 'pebble.stageHeader.spriteGrid'
    },
    openSettingsMessage: {
        defaultMessage: 'Open advanced settings',
        description: 'Button to open advanced settings in embeds',
        id: 'tw.openAdvanced'
    }
});

const enableSettingsButton = new URLSearchParams(location.search).has('settings-button');

const StageHeaderComponent = function (props) {
    const {
        customStageSize,
        showFixedLargeSize,
        isFullScreen,
        isPlayerOnly,
        onKeyPress,
        onSetStageFullScreen,
        onSetStageUnFullScreen,
        onSetStageLarge,
        onSetStageSmall,
        onSetStageFull,
        onOpenSettings,
        onSetSpriteListView,
        isEmbedded,
        spriteListView,
        stageSize,
        stageSizeMode,
        vm
    } = props;

    let header = null;

    const stageDimensions = getStageDimensions(stageSize, customStageSize, isFullScreen || isEmbedded);

    if (isFullScreen || isEmbedded) {
        const settingsButton = isEmbedded && enableSettingsButton ? (
            <div className={classNames(styles.settingsButton, styles.unselectWrapper)}>
                <Button
                    className={styles.stageButton}
                    onClick={onOpenSettings}
                >
                    <img
                        alt={props.intl.formatMessage(messages.openSettingsMessage)}
                        className={styles.stageButtonIcon}
                        draggable={false}
                        src={settingsIcon}
                        title={props.intl.formatMessage(messages.openSettingsMessage)}
                    />
                </Button>
            </div>
        ) : null;
        const fullscreenButton = isFullScreen ? (
            <div className={styles.unselectWrapper}>
                <Button
                    className={styles.stageButton}
                    onClick={onSetStageUnFullScreen}
                    onKeyPress={onKeyPress}
                >
                    <img
                        alt={props.intl.formatMessage(messages.unFullScreenMessage)}
                        className={styles.stageButtonIcon}
                        draggable={false}
                        src={unFullScreenIcon}
                        title={props.intl.formatMessage(messages.fullscreenControl)}
                    />
                </Button>
            </div>
        ) : FullscreenAPI.available() ? (
            <div className={styles.unselectWrapper}>
                <Button
                    className={styles.stageButton}
                    onClick={onSetStageFullScreen}
                >
                    <img
                        alt={props.intl.formatMessage(messages.fullScreenMessage)}
                        className={styles.stageButtonIcon}
                        draggable={false}
                        src={fullScreenIcon}
                        title={props.intl.formatMessage(messages.fullscreenControl)}
                    />
                </Button>
            </div>
        ) : null;
        header = (
            <Box
                className={classNames(styles.stageHeaderWrapperOverlay, {
                    [styles.embedded]: isEmbedded
                })}
            >
                <Box
                    className={styles.stageMenuWrapper}
                    style={{width: stageDimensions.width}}
                >
                    <Controls vm={vm} />
                    <div
                        className={styles.fullscreenButtonsRow}
                        key="fullscreen" // addons require the HTML element to be not be re-used by in-editor buttons
                    >
                        {settingsButton}
                        {fullscreenButton}
                    </div>
                </Box>
            </Box>
        );
    } else {
        const spriteListToggle = isPlayerOnly ? null : (
            <ToggleButtons
                className={styles.spriteListToggle}
                buttons={[
                    {
                        handleClick: () => onSetSpriteListView(!spriteListView),
                        icon: spriteListIcon,
                        iconClassName: styles.stageButtonIcon,
                        isSelected: spriteListView,
                        title: props.intl.formatMessage(spriteListView ?
                            messages.spriteGridMessage :
                            messages.spriteListMessage)
                    }
                ]}
            />
        );
        const stageControls =
            isPlayerOnly ? (
                []
            ) : (
                <div className={styles.stageSizeToggleGroup}>
                    <ToggleButtons
                        buttons={[
                            {
                                handleClick: onSetStageSmall,
                                icon: smallStageIcon,
                                iconClassName: styles.stageButtonIcon,
                                isSelected: stageSizeMode === STAGE_SIZE_MODES.small,
                                title: props.intl.formatMessage(messages.smallStageSizeMessage)
                            },
                            ...(showFixedLargeSize ? [
                                {
                                    handleClick: onSetStageLarge,
                                    icon: largeStageIcon,
                                    iconClassName: styles.stageButtonIcon,
                                    isSelected: stageSizeMode === STAGE_SIZE_MODES.large,
                                    title: props.intl.formatMessage(messages.largeStageSizeMessage)
                                }
                            ] : []),
                            {
                                handleClick: onSetStageFull,
                                icon: showFixedLargeSize ? fullStageIcon : largeStageIcon,
                                iconClassName: styles.stageButtonIcon,
                                isSelected: stageSizeMode === STAGE_SIZE_MODES.full,
                                title: props.intl.formatMessage(messages.fullStageSizeMessage)
                            }
                        ]}
                    />
                </div>
            );
        header = (
            <Box
                className={styles.stageHeaderWrapper}
                // + 2 px because the stage will have 2 pixels of border around it
                style={{minWidth: `${Math.max(stageDimensions.width, getMinWidth(stageSize)) + 2}px`}}
            >
                <Box className={styles.stageMenuWrapper}>
                    <Controls
                        vm={vm}
                        isSmall={stageSizeMode === STAGE_SIZE_MODES.small}
                    />
                    <div
                        className={styles.stageSizeRow}
                        key="editor" // addons require the HTML element to be not be re-used by in-editor buttons
                    >
                        {isPlayerOnly ? null : (
                            <ThumbnailButton compact={stageSizeMode === STAGE_SIZE_MODES.small} />
                        )}
                        {spriteListToggle}
                        {stageControls}
                        <div>
                            <Button
                                className={styles.stageButton}
                                onClick={onSetStageFullScreen}
                            >
                                <img
                                    alt={props.intl.formatMessage(messages.fullStageSizeMessage)}
                                    className={styles.stageButtonIcon}
                                    draggable={false}
                                    src={fullScreenIcon}
                                    title={props.intl.formatMessage(messages.fullscreenControl)}
                                />
                            </Button>
                        </div>
                    </div>
                </Box>
            </Box>
        );
    }

    return header;
};

const mapStateToProps = state => ({
    // This is the button's mode, as opposed to the actual current state
    stageSizeMode: state.scratchGui.stageSize.stageSize,
    spriteListView: state.scratchGui.tw.spriteListView
});

const mapDispatchToProps = dispatch => ({
    onSetSpriteListView: spriteListView => dispatch(setSpriteListView(spriteListView))
});

StageHeaderComponent.propTypes = {
    intl: intlShape,
    customStageSize: PropTypes.shape({
        width: PropTypes.number,
        height: PropTypes.number
    }),
    showFixedLargeSize: PropTypes.bool,
    isFullScreen: PropTypes.bool.isRequired,
    isPlayerOnly: PropTypes.bool.isRequired,
    onKeyPress: PropTypes.func.isRequired,
    onSetStageFullScreen: PropTypes.func.isRequired,
    onSetStageUnFullScreen: PropTypes.func.isRequired,
    onSetStageLarge: PropTypes.func.isRequired,
    onSetStageSmall: PropTypes.func.isRequired,
    onSetStageFull: PropTypes.func.isRequired,
    onOpenSettings: PropTypes.func.isRequired,
    onSetSpriteListView: PropTypes.func.isRequired,
    isEmbedded: PropTypes.bool.isRequired,
    spriteListView: PropTypes.bool,
    stageSize: PropTypes.oneOf(Object.keys(STAGE_DISPLAY_SIZES)),
    stageSizeMode: PropTypes.oneOf(Object.keys(STAGE_SIZE_MODES)),
    vm: PropTypes.instanceOf(VM).isRequired
};

StageHeaderComponent.defaultProps = {
    stageSizeMode: STAGE_SIZE_MODES.large
};

export default injectIntl(connect(
    mapStateToProps,
    mapDispatchToProps
)(StageHeaderComponent));
