import bindAll from 'lodash.bindall';
import classNames from 'classnames';
import React from 'react';

import AccountModal from '../pebble-account/account-modal.jsx';
import {
    accountsAvailable,
    getAvatarURL,
    getEmailLinkFromURL,
    getProfileURL,
    getUser,
    loadUser,
    onUserChange,
    signOut
} from '../../lib/pebble-accounts';
import pebbleLogo from '../menu-bar/pebble-logo.svg';
import {CaretIcon} from '../pebble-projects/icons.jsx';

import styles from './home.css';

/**
 * The right end of the site's top bar, like Scratch's: "Join PebbleIDE" and "Sign in",
 * or your picture and name with a menu.
 */
class SiteAccount extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleClose',
            'handleDocumentMouseDown',
            'handleJoin',
            'handleSignIn',
            'handleSignOut',
            'handleToggleMenu',
            'handleUserChange',
            'setMenu'
        ]);
        // Opened from a "reset your password" or "verify your email" email
        this.emailLink = getEmailLinkFromURL();
        this.state = {
            user: getUser(),
            available: accountsAvailable(),
            menuOpen: false,
            modal: this.emailLink ? {'reset-password': 'reset', 'verify-email': 'verify'}[this.emailLink.type] : null
        };
    }
    componentDidMount () {
        this.stopListening = onUserChange(this.handleUserChange);
        loadUser();
        document.addEventListener('mousedown', this.handleDocumentMouseDown);
        if (this.emailLink) {
            // So the link isn't left in the address bar
            history.replaceState(null, '', `${location.pathname}${location.search}`);
        }
    }
    componentWillUnmount () {
        this.stopListening();
        document.removeEventListener('mousedown', this.handleDocumentMouseDown);
    }
    setMenu (element) {
        this.menu = element;
    }
    handleUserChange (user) {
        this.setState({
            user,
            available: accountsAvailable(),
            menuOpen: false
        });
    }
    handleDocumentMouseDown (e) {
        if (this.state.menuOpen && this.menu && !this.menu.contains(e.target)) {
            this.setState({menuOpen: false});
        }
    }
    handleToggleMenu () {
        this.setState({menuOpen: !this.state.menuOpen});
    }
    handleJoin () {
        this.setState({modal: 'sign-up'});
    }
    handleSignIn () {
        this.setState({modal: 'sign-in'});
    }
    handleSignOut () {
        this.setState({menuOpen: false});
        signOut();
    }
    handleClose () {
        this.setState({modal: null});
    }
    renderSignedIn () {
        const {user, menuOpen} = this.state;
        const avatar = getAvatarURL(user.username, user.avatarVersion);
        return (
            <div
                className={styles.navAccount}
                ref={this.setMenu}
            >
                <button
                    aria-expanded={menuOpen}
                    className={classNames(styles.navItem, {[styles.navItemOpen]: menuOpen})}
                    type="button"
                    onClick={this.handleToggleMenu}
                >
                    <img
                        alt=""
                        className={classNames(styles.navAvatar, {[styles.navAvatarDefault]: !avatar})}
                        src={avatar || pebbleLogo}
                    />
                    <span className={styles.navHideSmall}>{user.username}</span>
                    <CaretIcon className={styles.navCaret} />
                </button>
                {menuOpen && (
                    <div className={styles.navMenu}>
                        <a
                            className={styles.navMenuItem}
                            href={getProfileURL(user.username)}
                        >
                            {'Profile'}
                        </a>
                        <a
                            className={styles.navMenuItem}
                            href="editor.html"
                        >
                            {'Make a project'}
                        </a>
                        <hr className={styles.navMenuLine} />
                        <button
                            className={styles.navMenuItem}
                            type="button"
                            onClick={this.handleSignOut}
                        >
                            {'Sign out'}
                        </button>
                    </div>
                )}
            </div>
        );
    }
    render () {
        const {user, available, modal} = this.state;
        return (
            <React.Fragment>
                {available && (user ? this.renderSignedIn() : (
                    <React.Fragment>
                        <button
                            className={classNames(styles.navItem, styles.navHideSmall)}
                            type="button"
                            onClick={this.handleJoin}
                        >
                            {'Join PebbleIDE'}
                        </button>
                        <button
                            className={styles.navItem}
                            type="button"
                            onClick={this.handleSignIn}
                        >
                            {'Sign in'}
                        </button>
                    </React.Fragment>
                ))}
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

export default SiteAccount;
