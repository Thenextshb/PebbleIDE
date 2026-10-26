import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';

import Button from '../button/button.jsx';
import AccountModal from '../pebble-account/account-modal.jsx';
import UploadModal from './upload-modal.jsx';
import {accountsAvailable, getUser, loadUser, onUserChange} from '../../lib/pebble-accounts';
import {PROJECTS_ENABLED} from '../../lib/pebble-projects';
import uploadIcon from './icon--upload.svg';

/**
 * The editor's "Upload" button, for sharing the project on PebbleIDE.
 */
class UploadButton extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleClick',
            'handleClose',
            'handleUserChange'
        ]);
        this.state = {
            available: accountsAvailable(),
            modal: null
        };
    }
    componentDidMount () {
        this.stopListening = onUserChange(this.handleUserChange);
        loadUser();
    }
    componentWillUnmount () {
        this.stopListening();
    }
    handleUserChange () {
        this.setState({available: accountsAvailable()});
    }
    handleClick () {
        // Sharing needs an account
        this.setState({modal: getUser() ? 'upload' : 'sign-in'});
    }
    handleClose () {
        this.setState({modal: null});
    }
    render () {
        if (!PROJECTS_ENABLED || !this.state.available) return null;
        return (
            <React.Fragment>
                <Button
                    className={this.props.className}
                    iconClassName={this.props.iconClassName}
                    iconHeight={20}
                    iconSrc={uploadIcon}
                    iconWidth={20}
                    title="Share this project on PebbleIDE"
                    onClick={this.handleClick}
                >
                    {'Upload'}
                </Button>
                {this.state.modal === 'upload' && (
                    <UploadModal
                        projectTitle={this.props.projectTitle}
                        vm={this.props.vm}
                        onClose={this.handleClose}
                    />
                )}
                {this.state.modal === 'sign-in' && (
                    <AccountModal
                        mode="sign-in"
                        onClose={this.handleClose}
                    />
                )}
            </React.Fragment>
        );
    }
}

UploadButton.propTypes = {
    className: PropTypes.string,
    iconClassName: PropTypes.string,
    projectTitle: PropTypes.string,
    vm: PropTypes.shape({
        renderer: PropTypes.object
    }).isRequired
};

const mapStateToProps = state => ({
    projectTitle: state.scratchGui.projectTitle,
    vm: state.scratchGui.vm
});

export default connect(mapStateToProps)(UploadButton);
