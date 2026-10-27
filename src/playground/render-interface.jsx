/**
 * Copyright (C) 2021 Thomas Weber
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3 as
 * published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';
import {compose} from 'redux';
import {defineMessages, injectIntl, intlShape} from 'react-intl';
import {getIsLoading} from '../reducers/project-state.js';
import {setPlayer} from '../reducers/mode.js';
import AppStateHOC from '../lib/app-state-hoc.jsx';
import ErrorBoundaryHOC from '../lib/error-boundary-hoc.jsx';
import TWStateManagerHOC from '../lib/tw-state-manager-hoc.jsx';
import SBFileUploaderHOC from '../lib/sb-file-uploader-hoc.jsx';
import TWPackagerIntegrationHOC from '../lib/tw-packager-integration-hoc.jsx';
import SettingsStore from '../addons/settings-store-singleton';
import '../lib/tw-fix-history-api';
import GUI from './render-gui.jsx';
import MenuBar from '../components/menu-bar/menu-bar.jsx';
import BrowserModal from '../components/browser-modal/browser-modal.jsx';
import TWWindchimeSubmitter from '../containers/tw-windchime-submitter.jsx';
import {isBrowserSupported} from '../lib/tw-environment-support-prober';
import AddonChannels from '../addons/channels';
import {loadServiceWorker} from './load-service-worker';
import runAddons from '../addons/entry';
import InvalidEmbed from '../components/tw-invalid-embed/invalid-embed.jsx';
import {APP_NAME} from '../lib/brand.js';
import {getUser, loadUser, onUserChange} from '../lib/pebble-accounts';
import {PROJECTS_ENABLED, openProject} from '../lib/pebble-projects';
import {PreviewHeader, PreviewSide, PreviewStats} from '../components/pebble-projects/project-page-preview.jsx';

import styles from './interface.css';

const isInvalidEmbed = window.parent !== window;

const handleClickAddonSettings = addonId => {
    // addonId might be a string of the addon to focus on, undefined, or an event (treat like undefined)
    const path = process.env.ROUTING_STYLE === 'wildcard' ? 'addons' : 'addons.html';
    const url = `${process.env.ROOT}${path}${typeof addonId === 'string' ? `#${addonId}` : ''}`;
    window.open(url);
};

// The logo in the menu bar goes back to the home page
const handleClickLogo = () => {
    location.href = new URL(process.env.ROOT || './', location.href).href;
};

const messages = defineMessages({
    defaultTitle: {
        defaultMessage: 'Block coding IDE',
        description: 'Title of homepage',
        id: 'pebble.guiDefaultTitle'
    }
});

const WrappedMenuBar = compose(
    SBFileUploaderHOC,
    TWPackagerIntegrationHOC
)(MenuBar);

if (AddonChannels.reloadChannel) {
    AddonChannels.reloadChannel.addEventListener('message', () => {
        location.reload();
    });
}

if (AddonChannels.changeChannel) {
    AddonChannels.changeChannel.addEventListener('message', e => {
        SettingsStore.setStoreWithVersionCheck(e.data);
    });
}

runAddons();

class Interface extends React.Component {
    constructor (props) {
        super(props);
        this.handleUpdateProjectTitle = this.handleUpdateProjectTitle.bind(this);
        this.handleUserChange = this.handleUserChange.bind(this);
        this.handleOpenProjectChange = this.handleOpenProjectChange.bind(this);
        this.state = {
            user: getUser(),
            sharedProject: openProject.get()
        };
    }
    componentDidMount () {
        // For the project page view: who made it, and its upvotes and views if it's shared
        this.stopListeningToUser = onUserChange(this.handleUserChange);
        this.stopListeningToProject = openProject.listen(this.handleOpenProjectChange);
        loadUser();
    }
    componentDidUpdate (prevProps) {
        if (prevProps.isLoading && !this.props.isLoading) {
            loadServiceWorker();
        }
    }
    componentWillUnmount () {
        this.stopListeningToUser();
        this.stopListeningToProject();
    }
    handleUserChange (user) {
        this.setState({user});
    }
    handleOpenProjectChange (sharedProject) {
        this.setState({sharedProject});
    }
    handleUpdateProjectTitle (title, isDefault) {
        if (isDefault || !title) {
            document.title = `${APP_NAME} - ${this.props.intl.formatMessage(messages.defaultTitle)}`;
        } else {
            document.title = `${title} - ${APP_NAME}`;
        }
    }
    render () {
        if (isInvalidEmbed) {
            return <InvalidEmbed />;
        }

        const {
            /* eslint-disable no-unused-vars */
            intl,
            isFullScreen,
            isLoading,
            isPlayerOnly,
            isRtl,
            onSeeInside,
            projectTitle,
            /* eslint-enable no-unused-vars */
            ...props
        } = this.props;
        const isHomepage = isPlayerOnly && !isFullScreen;
        const isEditor = !isPlayerOnly;
        // "See Project Page" looks like the project's page on the site
        const isPreview = isHomepage && PROJECTS_ENABLED;
        const {user, sharedProject} = this.state;
        let centerStyle = null;
        if (isPreview) {
            // + 2 accounts for 1px border on each side of the stage
            centerStyle = {'--stage-width': `${Math.max(480, props.customStageSize.width) + 2}px`};
        } else if (isPlayerOnly) {
            centerStyle = {width: `${Math.max(480, props.customStageSize.width) + 2}px`};
        }
        return (
            <div
                className={classNames(styles.container, {
                    [styles.playerOnly]: isHomepage,
                    [styles.editor]: isEditor
                })}
                dir={isRtl ? 'rtl' : 'ltr'}
            >
                <TWWindchimeSubmitter />
                {isHomepage ? (
                    <div className={styles.menu}>
                        <WrappedMenuBar
                            canChangeLanguage
                            canManageFiles
                            canChangeTheme
                            enableSeeInside
                            onClickAddonSettings={handleClickAddonSettings}
                            onClickLogo={handleClickLogo}
                        />
                    </div>
                ) : null}
                <div
                    className={classNames(styles.center, {[styles.preview]: isPreview})}
                    style={centerStyle}
                >
                    {isPreview && (
                        <PreviewHeader
                            project={sharedProject}
                            title={projectTitle}
                            user={user}
                            onSeeInside={onSeeInside}
                        />
                    )}
                    <GUI
                        key="gui"
                        onClickAddonSettings={handleClickAddonSettings}
                        onClickLogo={handleClickLogo}
                        onUpdateProjectTitle={this.handleUpdateProjectTitle}
                        backpackVisible
                        backpackHost="_local_"
                        {...props}
                    />
                    {isPreview && (
                        <PreviewStats project={sharedProject} />
                    )}
                    {isPreview && <PreviewSide project={sharedProject} />}
                    {isHomepage && !isBrowserSupported() && <BrowserModal isRtl={isRtl} />}
                </div>
            </div>
        );
    }
}

Interface.propTypes = {
    intl: intlShape,
    customStageSize: PropTypes.shape({
        width: PropTypes.number,
        height: PropTypes.number
    }),
    isFullScreen: PropTypes.bool,
    isLoading: PropTypes.bool,
    isPlayerOnly: PropTypes.bool,
    isRtl: PropTypes.bool,
    onSeeInside: PropTypes.func,
    projectTitle: PropTypes.string
};

const mapStateToProps = state => ({
    customStageSize: state.scratchGui.customStageSize,
    isFullScreen: state.scratchGui.mode.isFullScreen,
    isLoading: getIsLoading(state.scratchGui.projectState.loadingState),
    isPlayerOnly: state.scratchGui.mode.isPlayerOnly,
    isRtl: state.locales.isRtl,
    projectTitle: state.scratchGui.projectTitle
});

const mapDispatchToProps = dispatch => ({
    onSeeInside: () => dispatch(setPlayer(false))
});

const ConnectedInterface = injectIntl(connect(
    mapStateToProps,
    mapDispatchToProps
)(Interface));

const WrappedInterface = compose(
    AppStateHOC,
    ErrorBoundaryHOC('TW Interface'),
    TWStateManagerHOC,
    TWPackagerIntegrationHOC
)(ConnectedInterface);

export default WrappedInterface;
