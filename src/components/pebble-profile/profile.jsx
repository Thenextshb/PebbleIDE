import bindAll from 'lodash.bindall';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';

import {APP_NAME} from '../../lib/brand';
import {
    ROLE_NAMES,
    followUser,
    getAvatarURL,
    getProfile,
    getUser,
    loadUser,
    onUserChange,
    removeAvatar,
    sendVerificationEmail,
    setAvatar,
    signOut,
    unfollowUser,
    updateProfile
} from '../../lib/pebble-accounts';
import SiteBar from '../pebble-home/site-bar.jsx';
import AccountModal from '../pebble-account/account-modal.jsx';
import pebbleLogo from '../menu-bar/pebble-logo.svg';
import ProjectRow from '../pebble-projects/project-row.jsx';

import homeStyles from '../pebble-home/home.css';
import styles from './profile.css';

const MAX_BIO_LENGTH = 500;
const PICTURE_SIZE = 256;

/**
 * Shrink and crop a picture into a square profile picture.
 * @param {File} file The picture the user picked.
 * @returns {Promise<Blob>} A WebP (or PNG, where WebP isn't supported) picture.
 */
const makeProfilePicture = file => new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
        URL.revokeObjectURL(url);
        const canvas = document.createElement('canvas');
        canvas.width = PICTURE_SIZE;
        canvas.height = PICTURE_SIZE;
        const scale = Math.max(PICTURE_SIZE / image.width, PICTURE_SIZE / image.height);
        const width = image.width * scale;
        const height = image.height * scale;
        canvas.getContext('2d')
            .drawImage(image, (PICTURE_SIZE - width) / 2, (PICTURE_SIZE - height) / 2, width, height);
        canvas.toBlob(blob => {
            if (blob) resolve(blob);
            else reject(new Error('That picture couldn\'t be used. Try another one.'));
        }, 'image/webp', 0.85);
    };
    image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('That file isn\'t a picture PebbleIDE can use. Try a PNG or JPEG.'));
    };
    image.src = url;
});

// [] uses the browser's own language
const formatCount = (count, one, many) => `${count.toLocaleString()} ${count === 1 ? one : many}`;

const formatJoined = time => new Date(time).toLocaleDateString([], {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
});

const Avatar = ({username, version}) => {
    const url = getAvatarURL(username, version);
    // People without a picture get the PebbleIDE logo
    return (
        <img
            alt=""
            className={classNames(styles.avatar, {[styles.defaultAvatar]: !url})}
            src={url || pebbleLogo}
        />
    );
};

Avatar.propTypes = {
    username: PropTypes.string.isRequired,
    version: PropTypes.number
};

/**
 * A user's profile page: their picture, name, role and bio. On your own profile you can change them.
 */
class Profile extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleBioChange',
            'handleCloseSignIn',
            'handleFollow',
            'handleOpenSignIn',
            'handlePictureChosen',
            'handleRemovePicture',
            'handleSaveBio',
            'handleSendVerification',
            'handleSignOut',
            'handleUserChange'
        ]);
        this.state = {
            user: getUser(),
            username: new URLSearchParams(location.search).get('user'),
            profile: null,
            notFound: false,
            loadError: null,
            bio: null,
            busy: null,
            message: null,
            messageIsError: false,
            signingIn: false
        };
    }
    componentDidMount () {
        this.stopListening = onUserChange(this.handleUserChange);
        loadUser().then(user => this.showOwnProfileIfNoneChosen(user));
        if (this.state.username) this.loadProfile();
    }
    componentWillUnmount () {
        this.stopListening();
    }
    isOwnProfile () {
        const {user, profile} = this.state;
        return !!(user && profile && user.username.toLowerCase() === profile.username.toLowerCase());
    }
    loadProfile () {
        getProfile(this.state.username)
            .then(profile => {
                document.title = `${profile.username} - ${APP_NAME}`;
                this.setState({profile});
            })
            .catch(error => {
                if (error.code === 'no-user') this.setState({notFound: true});
                else this.setState({loadError: error.message});
            });
    }
    // profile.html on its own shows your own profile
    showOwnProfileIfNoneChosen (user) {
        if (this.state.username || !user) return;
        history.replaceState(null, '', `?user=${encodeURIComponent(user.username)}`);
        this.setState({username: user.username}, () => this.loadProfile());
    }
    handleUserChange (user) {
        const signedInAs = this.state.user && this.state.user.username;
        this.setState({user});
        this.showOwnProfileIfNoneChosen(user);
        const {profile} = this.state;
        if (!profile) return;
        if (user && user.username.toLowerCase() === profile.username.toLowerCase()) {
            // Your own changes show up on the page straight away
            this.setState({
                profile: {
                    ...profile,
                    bio: user.bio,
                    role: user.role,
                    avatarVersion: user.avatarVersion
                }
            });
        } else if ((user && user.username) !== signedInAs) {
            // Signed in or out, so whether you follow them may have changed
            this.loadProfile();
        }
    }
    async run (name, task, doneMessage) {
        this.setState({busy: name, message: null});
        try {
            await task();
            this.setState({busy: null, message: doneMessage, messageIsError: false});
        } catch (error) {
            this.setState({busy: null, message: error.message, messageIsError: true});
        }
    }
    handleBioChange (e) {
        this.setState({bio: e.target.value});
    }
    handleSaveBio () {
        this.run('bio', () => updateProfile({bio: this.state.bio}), 'Your bio is saved.')
            .then(() => {
                if (!this.state.messageIsError) this.setState({bio: null});
            });
    }
    handlePictureChosen (e) {
        const file = e.target.files[0];
        e.target.value = '';
        if (!file) return;
        this.run('picture', async () => {
            await setAvatar(await makeProfilePicture(file));
        }, 'Your new profile picture is saved.');
    }
    handleRemovePicture () {
        this.run('picture', removeAvatar, 'Your profile picture is removed.');
    }
    handleSendVerification () {
        this.run('verify', sendVerificationEmail, 'Sent! Check your inbox (and spam folder) for the link.');
    }
    handleSignOut () {
        this.run('sign-out', signOut, null);
    }
    handleFollow () {
        const {user, profile} = this.state;
        if (!user) {
            this.setState({signingIn: true});
            return;
        }
        this.run('follow', async () => {
            const counts = await (profile.youFollow ? unfollowUser : followUser)(profile.username);
            this.setState({profile: {...this.state.profile, ...counts}});
        }, null);
    }
    handleOpenSignIn () {
        this.setState({signingIn: true});
    }
    handleCloseSignIn () {
        this.setState({signingIn: false});
    }
    renderMessage () {
        const {message, messageIsError} = this.state;
        if (!message) return null;
        return (
            <p
                className={classNames(styles.message, {[styles.messageError]: messageIsError})}
                role={messageIsError ? 'alert' : 'status'}
            >
                {message}
            </p>
        );
    }
    renderBio () {
        const {profile, user, busy} = this.state;
        if (!this.isOwnProfile()) {
            return profile.bio ?
                <p className={styles.bio}>{profile.bio}</p> :
                <p className={styles.empty}>{`${profile.username} hasn't written a bio yet.`}</p>;
        }
        const verified = user.emailVerified;
        const bio = this.state.bio === null ? profile.bio : this.state.bio;
        return (
            <div className={styles.bioEditor}>
                <textarea
                    aria-label="Your bio"
                    className={styles.bioInput}
                    disabled={!verified}
                    maxLength={MAX_BIO_LENGTH}
                    placeholder={verified ? 'Tell people about yourself and what you make.' : ''}
                    value={bio}
                    onChange={this.handleBioChange}
                />
                <div className={styles.bioFooter}>
                    <span className={styles.count}>{`${bio.length}/${MAX_BIO_LENGTH}`}</span>
                    <button
                        className={styles.button}
                        disabled={!verified || busy === 'bio' || bio === profile.bio}
                        type="button"
                        onClick={this.handleSaveBio}
                    >
                        {busy === 'bio' ? 'Saving…' : 'Save bio'}
                    </button>
                </div>
            </div>
        );
    }
    renderOwnSettings () {
        const {user, profile, busy} = this.state;
        const verified = user.emailVerified;
        return (
            <section className={styles.box}>
                <h2 className={styles.boxHeading}>{'Your account'}</h2>
                {verified ? (
                    <p className={styles.text}>
                        {'Email: '}
                        <strong>{user.email}</strong>
                        <span className={styles.verified}>{'(verified)'}</span>
                    </p>
                ) : (
                    <div className={styles.verifyBox}>
                        <p className={styles.text}>
                            {'Verify your email to change your bio and profile picture. We sent a link to '}
                            <strong>{user.email}</strong>
                            {'.'}
                        </p>
                        <button
                            className={styles.button}
                            disabled={busy === 'verify'}
                            type="button"
                            onClick={this.handleSendVerification}
                        >
                            {busy === 'verify' ? 'Sending…' : 'Send the link again'}
                        </button>
                    </div>
                )}
                <div className={styles.buttons}>
                    <label
                        className={classNames(styles.button, {[styles.disabled]: !verified || busy === 'picture'})}
                    >
                        <input
                            accept="image/*"
                            className={styles.fileInput}
                            disabled={!verified || busy === 'picture'}
                            type="file"
                            onChange={this.handlePictureChosen}
                        />
                        {busy === 'picture' ? 'Saving…' : 'Change picture'}
                    </label>
                    {profile.avatarVersion && (
                        <button
                            className={classNames(styles.button, styles.secondary)}
                            disabled={busy === 'picture'}
                            type="button"
                            onClick={this.handleRemovePicture}
                        >
                            {'Remove picture'}
                        </button>
                    )}
                    <button
                        className={classNames(styles.button, styles.secondary)}
                        disabled={busy === 'sign-out'}
                        type="button"
                        onClick={this.handleSignOut}
                    >
                        {'Sign out'}
                    </button>
                </div>
                {this.renderMessage()}
            </section>
        );
    }
    renderContent () {
        const {username, user, profile, notFound, loadError} = this.state;
        if (!username) {
            if (typeof user === 'undefined') return <p className={styles.empty}>{'Loading…'}</p>;
            return (
                <section className={classNames(styles.box, styles.center)}>
                    <p className={styles.text}>{'Sign in to see your profile.'}</p>
                    <button
                        className={styles.button}
                        type="button"
                        onClick={this.handleOpenSignIn}
                    >
                        {'Sign in'}
                    </button>
                </section>
            );
        }
        if (notFound) {
            return <p className={styles.empty}>{`There's no ${APP_NAME} user called "${username}".`}</p>;
        }
        if (loadError) return <p className={styles.empty}>{loadError}</p>;
        if (!profile) return <p className={styles.empty}>{'Loading…'}</p>;
        const own = this.isOwnProfile();
        return (
            <React.Fragment>
                <header className={styles.header}>
                    <Avatar
                        username={profile.username}
                        version={profile.avatarVersion}
                    />
                    <h1 className={styles.username}>{profile.username}</h1>
                    <div className={styles.followArea}>
                        <span className={styles.followers}>
                            {formatCount(profile.followers, 'follower', 'followers')}
                        </span>
                        {!own && (
                            <button
                                className={classNames(styles.followButton, {[styles.unfollow]: profile.youFollow})}
                                disabled={this.state.busy === 'follow'}
                                type="button"
                                onClick={this.handleFollow}
                            >
                                {profile.youFollow ? 'Unfollow' : 'Follow'}
                            </button>
                        )}
                    </div>
                </header>
                {!own && this.renderMessage()}
                <div className={styles.row}>
                    <section className={classNames(styles.box, styles.about)}>
                        <h2 className={styles.boxHeading}>{'About Me'}</h2>
                        {this.renderBio()}
                    </section>
                    <section className={classNames(styles.box, styles.side)}>
                        <h2 className={styles.sideHeading}>{'Role'}</h2>
                        <p className={classNames(styles.role, styles[`role-${profile.role}`])}>
                            {ROLE_NAMES[profile.role] || profile.role}
                        </p>
                        <h2 className={styles.sideHeading}>{'Following'}</h2>
                        <p className={styles.sideValue}>{profile.following.toLocaleString()}</p>
                        <h2 className={styles.sideHeading}>{'Joined'}</h2>
                        <p className={styles.sideValue}>{formatJoined(profile.joined)}</p>
                    </section>
                </div>
                {own && this.renderOwnSettings()}
                <ProjectRow
                    emptyText={own ?
                        'You haven\'t shared any projects yet. Click Upload in the editor to share one.' :
                        'No shared projects yet.'}
                    list="user"
                    title={own ? 'Your projects' : `${profile.username}'s projects`}
                    user={profile.username}
                />
                {own && (
                    <ProjectRow
                        emptyText="Nothing saved yet. Click Save on a project to keep it here."
                        list="saved"
                        title="Saved projects"
                    />
                )}
            </React.Fragment>
        );
    }
    render () {
        return (
            <div className={homeStyles.page}>
                <SiteBar />
                <main className={styles.main}>
                    {this.renderContent()}
                </main>
                {this.state.signingIn && (
                    <AccountModal
                        mode="sign-in"
                        onClose={this.handleCloseSignIn}
                    />
                )}
            </div>
        );
    }
}

export default Profile;
