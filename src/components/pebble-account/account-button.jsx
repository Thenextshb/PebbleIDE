import bindAll from 'lodash.bindall';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';

import Button from '../button/button.jsx';
import AccountModal from './account-modal.jsx';
import {
    accountsAvailable,
    getAvatarURL,
    getEmailLinkFromURL,
    getProfileURL,
    getUser,
    loadUser,
    onUserChange
} from '../../lib/pebble-accounts';
import accountIcon from './icon--account.svg';
import styles from './account.css';

/**
 * "Sign in" button, or the signed-in user's picture and name, which go to their profile.
 */
class AccountButton extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleClick',
            'handleClose',
            'handleUserChange'
        ]);
        // Opened from a "reset your password" or "verify your email" email
        this.emailLink = props.handleEmailLinks ? getEmailLinkFromURL() : null;
        this.state = {
            user: getUser(),
            available: accountsAvailable(),
            modal: this.emailLink ? {'reset-password': 'reset', 'verify-email': 'verify'}[this.emailLink.type] : null
        };
    }
    componentDidMount () {
        this.stopListening = onUserChange(this.handleUserChange);
        loadUser();
        if (this.emailLink) {
            // So the link isn't left in the address bar
            history.replaceState(null, '', `${location.pathname}${location.search}`);
        }
    }
    componentWillUnmount () {
        this.stopListening();
    }
    handleUserChange (user) {
        this.setState({
            user,
            available: accountsAvailable()
        });
    }
    handleClick () {
        const {user} = this.state;
        if (!user) {
            this.setState({modal: 'sign-in'});
        } else if (this.props.profileInNewTab) {
            // So unsaved work in the editor isn't lost
            window.open(getProfileURL(user.username), '_blank');
        } else {
            location.href = getProfileURL(user.username);
        }
    }
    handleClose () {
        this.setState({modal: null});
    }
    render () {
        const {user, available, modal} = this.state;
        const avatar = user && getAvatarURL(user.username, user.avatarVersion);
        return (
            <React.Fragment>
                {available && (
                    <Button
                        className={this.props.className}
                        iconClassName={classNames(this.props.iconClassName, {[styles.avatarIcon]: avatar})}
                        iconHeight={20}
                        iconSrc={avatar || accountIcon}
                        iconWidth={20}
                        title={user ? 'Your profile' : 'Sign in or create an account'}
                        onClick={this.handleClick}
                    >
                        {user ? user.username : 'Sign in'}
                    </Button>
                )}
                {modal && (
                    <AccountModal
                        mode={modal}
                        token={this.emailLink ? this.emailLink.token : null}
                        onClose={this.handleClose}
                    />
                )}
            </React.Fragment>
        );
    }
}

AccountButton.propTypes = {
    className: PropTypes.string,
    handleEmailLinks: PropTypes.bool,
    iconClassName: PropTypes.string,
    profileInNewTab: PropTypes.bool
};

export default AccountButton;
