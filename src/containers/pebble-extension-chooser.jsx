import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';
import ExtensionChooserComponent from '../components/pebble-extension-chooser/extension-chooser.jsx';
import {
    closeExtensionChooserModal,
    openExtensionLibrary,
    openCustomExtensionModal
} from '../reducers/modals';
import {getExtensionInfo, getReplaceTarget, clearReplaceTarget} from '../lib/pebble-extensions';

class PebbleExtensionChooser extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleCancel',
            'handleChooseLibrary',
            'handleChooseCustom'
        ]);
    }
    handleCancel () {
        clearReplaceTarget();
        this.props.onClose();
    }
    // A replacement in progress stays pending until the library or custom extension modal uses it
    handleChooseLibrary () {
        this.props.onClose();
        this.props.onOpenExtensionLibrary();
    }
    handleChooseCustom () {
        this.props.onClose();
        this.props.onOpenCustomExtensionModal();
    }
    render () {
        const replacing = getReplaceTarget();
        const info = replacing ? getExtensionInfo(this.props.vm, replacing) : null;
        return (
            <ExtensionChooserComponent
                replacingName={info ? info.name : null}
                onCancel={this.handleCancel}
                onChooseCustom={this.handleChooseCustom}
                onChooseLibrary={this.handleChooseLibrary}
            />
        );
    }
}

PebbleExtensionChooser.propTypes = {
    onClose: PropTypes.func.isRequired,
    onOpenCustomExtensionModal: PropTypes.func.isRequired,
    onOpenExtensionLibrary: PropTypes.func.isRequired,
    vm: PropTypes.shape({
        runtime: PropTypes.object
    }).isRequired
};

const mapStateToProps = state => ({
    vm: state.scratchGui.vm
});

const mapDispatchToProps = dispatch => ({
    onClose: () => dispatch(closeExtensionChooserModal()),
    onOpenExtensionLibrary: () => dispatch(openExtensionLibrary()),
    onOpenCustomExtensionModal: () => dispatch(openCustomExtensionModal())
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(PebbleExtensionChooser);
