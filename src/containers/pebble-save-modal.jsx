import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';
import SaveModalComponent from '../components/pebble-save-modal/save-modal.jsx';
import SB3Downloader from './sb3-downloader.jsx';
import {closeSaveFormatModal} from '../reducers/modals';
import {projectTitleInitialState} from '../reducers/project-title';
import {showStandardAlert, showAlertWithTimeout} from '../reducers/alerts';
import {FORMATS, getFormat, exportProject, getScratchProblems} from '../lib/pebble-export-formats';
import downloadBlob from '../lib/download-blob';
import log from '../lib/log';

const FORMAT_STORAGE_KEY = 'pebble:saveFormat';

const getStoredFormat = () => {
    try {
        return getFormat(localStorage.getItem(FORMAT_STORAGE_KEY)).id;
    } catch (e) {
        return FORMATS[0].id;
    }
};

const storeFormat = format => {
    try {
        localStorage.setItem(FORMAT_STORAGE_KEY, format);
    } catch (e) {
        // ignore
    }
};

class PebbleSaveModal extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleSelect',
            'handleSave'
        ]);
        this.state = {
            format: getStoredFormat()
        };
        try {
            this.scratchProblems = getScratchProblems(props.vm);
        } catch (e) {
            log.error(e);
            this.scratchProblems = null;
        }
    }
    handleSelect (e) {
        this.setState({
            format: e.target.value
        });
    }
    handleSave (downloadProject, saveFilePicker) {
        const format = this.state.format;
        storeFormat(format);
        if (format === 'pebbleide') {
            // The normal saver also remembers the file so "Save to {file}" works afterwards
            if (saveFilePicker.available) {
                saveFilePicker.saveAsNew();
            } else {
                downloadProject();
            }
            this.props.onClose();
            return;
        }
        this.exportAs(format);
    }
    async exportAs (formatId) {
        const format = getFormat(formatId);
        const filename = `${this.props.projectTitle.substring(0, 100)}.${format.extension}`;

        // The file picker must open right away, while the click still counts as the user's action
        let handle = null;
        if (this.props.showSaveFilePicker) {
            try {
                handle = await this.props.showSaveFilePicker({
                    suggestedName: filename,
                    types: [
                        {
                            description: `${format.extension.toUpperCase()} Project`,
                            accept: {
                                'application/octet-stream': `.${format.extension}`
                            }
                        }
                    ],
                    excludeAcceptAllOption: true
                });
            } catch (e) {
                // AbortError means the file picker was cancelled
                if (e && e.name !== 'AbortError') {
                    log.error(e);
                    this.props.onShowSaveErrorAlert();
                }
                return;
            }
        }

        this.props.onClose();
        this.props.onShowSavingAlert();
        try {
            const blob = await exportProject(this.props.vm, formatId);
            if (handle) {
                const writable = await handle.createWritable();
                await writable.write(blob);
                await writable.close();
            } else {
                downloadBlob(filename, blob);
            }
            this.props.onShowSaveSuccessAlert();
        } catch (e) {
            log.error(e);
            this.props.onShowSaveErrorAlert();
        }
    }
    render () {
        return (
            <SB3Downloader>{(_className, downloadProject, saveFilePicker) => (
                <SaveModalComponent
                    formats={FORMATS}
                    selected={this.state.format}
                    scratchProblems={this.scratchProblems}
                    onCancel={this.props.onClose}
                    onSelect={this.handleSelect}
                    // eslint-disable-next-line react/jsx-no-bind
                    onSave={() => this.handleSave(downloadProject, saveFilePicker)}
                />
            )}</SB3Downloader>
        );
    }
}

PebbleSaveModal.propTypes = {
    onClose: PropTypes.func.isRequired,
    onShowSavingAlert: PropTypes.func.isRequired,
    onShowSaveSuccessAlert: PropTypes.func.isRequired,
    onShowSaveErrorAlert: PropTypes.func.isRequired,
    projectTitle: PropTypes.string.isRequired,
    showSaveFilePicker: PropTypes.func,
    vm: PropTypes.shape({
        saveProjectSb3: PropTypes.func,
        toJSON: PropTypes.func,
        runtime: PropTypes.object
    }).isRequired
};

PebbleSaveModal.defaultProps = {
    showSaveFilePicker: typeof showSaveFilePicker === 'function' && !navigator.userAgent.includes('Android') ?
        window.showSaveFilePicker.bind(window) :
        null
};

const mapStateToProps = state => ({
    projectTitle: state.scratchGui.projectTitle || projectTitleInitialState,
    vm: state.scratchGui.vm
});

const mapDispatchToProps = dispatch => ({
    onClose: () => dispatch(closeSaveFormatModal()),
    onShowSavingAlert: () => showAlertWithTimeout(dispatch, 'saving'),
    onShowSaveSuccessAlert: () => showAlertWithTimeout(dispatch, 'twSaveToDiskSuccess'),
    onShowSaveErrorAlert: () => dispatch(showStandardAlert('savingError'))
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(PebbleSaveModal);
