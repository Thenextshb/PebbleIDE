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
import SiteFooter from '../pebble-home/site-footer.jsx';
import AccountModal from '../pebble-account/account-modal.jsx';
import pebbleLogo from '../menu-bar/pebble-logo.svg';
import ProjectRow from '../pebble-projects/project-row.jsx';
import ReportModal from '../pebble-reports/report-modal.jsx';
import ReportsList from '../pebble-reports/reports-list.jsx';
import {isStaff} from '../../lib/pebble-reports';

import homeStyles from '../pebble-home/home.css';
import projectStyles from '../pebble-projects/projects.css';
import styles from './profile.css';
import reportStyles from '../pebble-reports/reports.css';

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
 * A box with a title bar, like Scratch's.
 * @param {object} props Props.
 * @returns {React.ReactElement} The box.
 */
const Box = ({title, children}) => (
    <section className={projectStyles.box}>
        <div className={projectStyles.boxHeader}>
            <h2 className={projectStyles.boxTitle}>{title}</h2>
        </div>
        <div className={projectStyles.boxContent}>{children}</div>
    </section>
);

Box.propTypes = {
    children: PropTypes.node,
    title: PropTypes.string
};

/**
 * A user's profile page: their picture, name, role and bio. On your own profile you can change them.
 */
class Profile extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleBioChange',
            'handleCloseReport',
            'handleCloseSignIn',
            'handleFollow',
            'handleOpenSignIn',
            'handleReport',
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
            signingIn: false,
            reporting: false
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
    handleReport () {
        // Reporting needs an account
        if (this.state.user) this.setState({reporting: true});
        else this.setState({signingIn: true});
    }
    handleCloseReport () {
        this.setState({reporting: false});
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
                <p className={projectStyles.note}>{`${profile.username} hasn't written anything here yet.`}</p>;
        }
        const verified = user.emailVerified;
        const bio = this.state.bio === null ? profile.bio : this.state.bio;
        return (
            <div className={styles.bioEditor}>
                <textarea
                    aria-label="About me"
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
                        className={classNames(projectStyles.button, projectStyles.small)}
                        disabled={!verified || busy === 'bio' || bio === profile.bio}
                        type="button"
                        onClick={this.handleSaveBio}
                    >
                        {busy === 'bio' ? 'Saving…' : 'Save'}
                    </button>
                </div>
            </div>
        );
    }
    renderOwnSettings () {
        const {user, profile, busy} = this.state;
        const verified = user.emailVerified;
        return (
            <Box title="Your account">
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
                            className={classNames(projectStyles.button, projectStyles.small)}
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
                        className={classNames(projectStyles.button, projectStyles.small, {
                            [projectStyles.disabled]: !verified || busy === 'picture'
                        })}
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
                            className={classNames(projectStyles.button, projectStyles.small, projectStyles.secondary)}
                            disabled={busy === 'picture'}
                            type="button"
                            onClick={this.handleRemovePicture}
                        >
                            {'Remove picture'}
                        </button>
                    )}
                    <button
                        className={classNames(projectStyles.button, projectStyles.small, projectStyles.secondary)}
                        disabled={busy === 'sign-out'}
                        type="button"
                        onClick={this.handleSignOut}
                    >
                        {'Sign out'}
                    </button>
                </div>
                {this.renderMessage()}
            </Box>
        );
    }
    renderContent () {
        const {username, user, profile, notFound, loadError} = this.state;
        if (!username) {
            if (typeof user === 'undefined') return <p className={styles.empty}>{'Loading…'}</p>;
            return (
                <Box title="Profile">
                    <p className={styles.text}>{'Sign in to see your profile.'}</p>
                    <div>
                        <button
                            className={projectStyles.button}
                            type="button"
                            onClick={this.handleOpenSignIn}
                        >
                            {'Sign in'}
                        </button>
                    </div>
                </Box>
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
                <section className={classNames(projectStyles.box, styles.header)}>
                    <Avatar
                        username={profile.username}
                        version={profile.avatarVersion}
                    />
                    <div className={styles.headerText}>
                        <h1 className={styles.username}>{profile.username}</h1>
                        <div className={styles.meta}>
                            <span className={classNames(styles.role, styles[`role-${profile.role}`])}>
                                {ROLE_NAMES[profile.role] || profile.role}
                            </span>
                            <span>{`Joined ${formatJoined(profile.joined)}`}</span>
                        </div>
                        <div className={styles.meta}>
                            <span>
                                <strong>{profile.followers.toLocaleString()}</strong>
                                {profile.followers === 1 ? ' follower' : ' followers'}
                            </span>
                            <span>
                                <strong>{profile.following.toLocaleString()}</strong>
                                {' following'}
                            </span>
                        </div>
                    </div>
                    {!own && (
                        <div className={styles.headerActions}>
                            <button
                                className={classNames(projectStyles.button, {
                                    [projectStyles.secondary]: profile.youFollow
                                })}
                                disabled={this.state.busy === 'follow'}
                                type="button"
                                onClick={this.handleFollow}
                            >
                                {profile.youFollow ? 'Unfollow' : 'Follow'}
                            </button>
                            <button
                                className={reportStyles.reportButton}
                                type="button"
                                onClick={this.handleReport}
                            >
                                {'⚑ Report this user'}
                            </button>
                        </div>
                    )}
                </section>
                {!own && this.renderMessage()}
                <div className={classNames(styles.row, {[styles.rowSingle]: !own})}>
                    <Box title="About me">
                        {this.renderBio()}
                    </Box>
                    {own && this.renderOwnSettings()}
                </div>
                {own && isStaff(this.state.user) && <ReportsList />}
                <ProjectRow
                    showCount
                    emptyText={own ?
                        'You haven\'t shared any projects yet. Click Upload in the editor to share one.' :
                        'No shared projects yet.'}
                    list="user"
                    title="Shared Projects"
                    user={profile.username}
                />
                {own && (
                    <ProjectRow
                        showCount
                        emptyText="Nothing saved yet. Click Save on a project to keep it here."
                        list="saved"
                        title="Saved Projects"
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
                <SiteFooter />
                {this.state.signingIn && (
                    <AccountModal
                        mode="sign-in"
                        onClose={this.handleCloseSignIn}
                    />
                )}
                {this.state.reporting && this.state.profile && (
                    <ReportModal
                        kind="user"
                        name={this.state.profile.username}
                        target={this.state.profile.username}
                        onClose={this.handleCloseReport}
                    />
                )}
            </div>
        );
    }
}

export default Profile;
