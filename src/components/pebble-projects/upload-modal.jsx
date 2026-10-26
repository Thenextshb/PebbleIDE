import bindAll from 'lodash.bindall';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';
import ReactDOM from 'react-dom';

import {getProfileURL, getUser, onUserChange} from '../../lib/pebble-accounts';
import {exportProject} from '../../lib/pebble-export-formats';
import {
    chosenThumbnail,
    getProjectPageURL,
    makeStageThumbnail,
    makeThumbnail,
    openProject,
    shareProject,
    updateProject
} from '../../lib/pebble-projects';
import accountStyles from '../pebble-account/account.css';
import styles from './upload.css';

const MAX_TITLE_LENGTH = 80;
const MAX_DESCRIPTION_LENGTH = 2000;

/**
 * The editor's pop-up for sharing a project, or updating one you already shared.
 */
class UploadModal extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleChange',
            'handleChooseFile',
            'handleClose',
            'handleCopyLink',
            'handleFileInputChange',
            'handleKeyDown',
            'handleOverlayMouseDown',
            'handleShareAsNew',
            'handleSubmit',
            'handleThumbnailChosen',
            'handleUseStage',
            'handleUserChange',
            'setFileInput'
        ]);
        const open = openProject.get();
        const updating = !!(open && open.isOwner);
        this.state = {
            updating,
            title: ((updating ? open.title : props.projectTitle) || '').slice(0, MAX_TITLE_LENGTH),
            description: updating ? open.description : '',
            thumbnail: chosenThumbnail.get(),
            thumbnailURL: null,
            user: getUser(),
            busy: false,
            error: null,
            message: null,
            shared: null
        };
    }
    componentDidMount () {
        document.addEventListener('keydown', this.handleKeyDown);
        this.stopListeningToUser = onUserChange(this.handleUserChange);
        this.stopListeningToThumbnail = chosenThumbnail.listen(this.handleThumbnailChosen);
        if (this.state.thumbnail) {
            this.showThumbnail(this.state.thumbnail);
        } else {
            this.useStageThumbnail();
        }
    }
    componentWillUnmount () {
        this.unmounted = true;
        document.removeEventListener('keydown', this.handleKeyDown);
        this.stopListeningToUser();
        this.stopListeningToThumbnail();
        if (this.state.thumbnailURL) URL.revokeObjectURL(this.state.thumbnailURL);
    }
    setFileInput (element) {
        this.fileInput = element;
    }
    showThumbnail (thumbnail) {
        if (this.unmounted) return;
        if (this.state.thumbnailURL) URL.revokeObjectURL(this.state.thumbnailURL);
        this.setState({
            thumbnail,
            thumbnailURL: thumbnail ? URL.createObjectURL(thumbnail) : null
        });
    }
    useStageThumbnail () {
        makeStageThumbnail(this.props.vm)
            .then(thumbnail => this.showThumbnail(thumbnail))
            .catch(() => this.showThumbnail(null));
    }
    handleThumbnailChosen (thumbnail) {
        if (thumbnail) this.showThumbnail(thumbnail);
    }
    handleUserChange (user) {
        this.setState({user});
    }
    handleChange (e) {
        this.setState({[e.target.name]: e.target.value});
    }
    handleChooseFile () {
        this.fileInput.click();
    }
    handleUseStage () {
        chosenThumbnail.set(null);
        this.useStageThumbnail();
    }
    handleFileInputChange (e) {
        const file = e.target.files[0];
        e.target.value = '';
        if (file) this.handleThumbnailFile(file);
    }
    async handleThumbnailFile (file) {
        try {
            chosenThumbnail.set(await makeThumbnail(file));
        } catch (error) {
            this.setState({error: error.message});
        }
    }
    handleClose () {
        if (!this.state.busy) this.props.onClose();
    }
    handleKeyDown (e) {
        if (e.key === 'Escape') this.handleClose();
    }
    handleOverlayMouseDown (e) {
        if (e.target === e.currentTarget) this.handleClose();
    }
    handleShareAsNew () {
        this.setState({updating: false, error: null});
    }
    handleCopyLink () {
        const link = getProjectPageURL(this.state.shared.id);
        navigator.clipboard.writeText(link)
            .then(() => this.setState({message: 'Link copied.'}))
            .catch(() => this.setState({message: link}));
    }
    async handleSubmit (e) {
        e.preventDefault();
        const {busy, updating, title, description, thumbnail} = this.state;
        if (busy) return;
        if (!title.trim()) {
            this.setState({error: 'Give your project a name.'});
            return;
        }
        this.setState({busy: true, error: null});
        try {
            const upload = {
                title,
                description,
                project: await exportProject(this.props.vm, 'pebbleide'),
                thumbnail
            };
            const shared = updating ?
                await updateProject(openProject.get().id, upload) :
                await shareProject(upload);
            // Uploading again from this editor updates this project
            openProject.set(shared);
            if (!this.unmounted) this.setState({busy: false, shared});
        } catch (error) {
            if (!this.unmounted) this.setState({busy: false, error: error.message});
        }
    }
    renderDone () {
        const {shared, updating, message} = this.state;
        return (
            <React.Fragment>
                <p className={accountStyles.text}>
                    {updating ? 'Your project is updated.' : 'Your project is shared! Anyone with the link can see it.'}
                </p>
                <a
                    className={accountStyles.submit}
                    href={getProjectPageURL(shared.id)}
                    rel="noreferrer"
                    target="_blank"
                >
                    {'See the project page'}
                </a>
                <div className={styles.buttons}>
                    <button
                        className={styles.button}
                        type="button"
                        onClick={this.handleCopyLink}
                    >
                        {'Copy link'}
                    </button>
                    <button
                        className={styles.button}
                        type="button"
                        onClick={this.handleClose}
                    >
                        {'Done'}
                    </button>
                </div>
                {message && <p className={accountStyles.hint}>{message}</p>}
            </React.Fragment>
        );
    }
    renderVerify () {
        const {user} = this.state;
        return (
            <React.Fragment>
                <p className={accountStyles.text}>
                    {'Verify your email before sharing projects. We sent a link to '}
                    <strong>{user.email}</strong>
                    {'. You can ask for a new one on your profile.'}
                </p>
                <a
                    className={accountStyles.submit}
                    href={getProfileURL(user.username)}
                    rel="noreferrer"
                    target="_blank"
                >
                    {'Open your profile'}
                </a>
            </React.Fragment>
        );
    }
    renderUpdateNote () {
        const open = openProject.get();
        const minutes = Math.ceil((open.nextChangeAt - Date.now()) / 60000);
        return (
            <p className={accountStyles.hint}>
                {minutes > 0 ?
                    `You can update it again in ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}. ` :
                    'Projects can be changed once every 10 minutes. '}
                <button
                    className={accountStyles.link}
                    type="button"
                    onClick={this.handleShareAsNew}
                >
                    {'Share as a new project instead'}
                </button>
            </p>
        );
    }
    renderForm () {
        const {updating, title, description, thumbnailURL, busy, error} = this.state;
        return (
            <React.Fragment>
                <label className={accountStyles.field}>
                    <span className={accountStyles.label}>{'Name'}</span>
                    <input
                        className={accountStyles.input}
                        maxLength={MAX_TITLE_LENGTH}
                        name="title"
                        type="text"
                        value={title}
                        onChange={this.handleChange}
                    />
                </label>
                <label className={accountStyles.field}>
                    <span className={accountStyles.label}>{'Description'}</span>
                    <textarea
                        className={classNames(accountStyles.input, styles.description)}
                        maxLength={MAX_DESCRIPTION_LENGTH}
                        name="description"
                        placeholder="What is it, and how do you play it?"
                        value={description}
                        onChange={this.handleChange}
                    />
                </label>
                <div className={accountStyles.field}>
                    <span className={accountStyles.label}>{'Thumbnail'}</span>
                    <div className={styles.thumbnailRow}>
                        {thumbnailURL ?
                            <img
                                alt=""
                                className={styles.thumbnail}
                                src={thumbnailURL}
                            /> :
                            <div className={styles.thumbnail} />}
                        <div className={styles.thumbnailButtons}>
                            <button
                                className={styles.button}
                                type="button"
                                onClick={this.handleChooseFile}
                            >
                                {'Choose image…'}
                            </button>
                            <button
                                className={styles.button}
                                type="button"
                                onClick={this.handleUseStage}
                            >
                                {'Use the stage'}
                            </button>
                        </div>
                    </div>
                </div>
                {updating && this.renderUpdateNote()}
                {error && (
                    <p
                        className={accountStyles.error}
                        role="alert"
                    >
                        {error}
                    </p>
                )}
                <button
                    className={accountStyles.submit}
                    disabled={busy}
                    type="submit"
                >
                    {busy ? 'Uploading…' : (updating ? 'Update project' : 'Share project')}
                </button>
            </React.Fragment>
        );
    }
    render () {
        const {user, shared, updating} = this.state;
        let content;
        if (shared) content = this.renderDone();
        else if (user && !user.emailVerified) content = this.renderVerify();
        else content = this.renderForm();
        return ReactDOM.createPortal((
            <div
                className={accountStyles.overlay}
                onMouseDown={this.handleOverlayMouseDown}
            >
                <form
                    noValidate
                    aria-labelledby="pebble-upload-title"
                    aria-modal="true"
                    className={classNames(accountStyles.dialog, styles.dialog)}
                    role="dialog"
                    onSubmit={this.handleSubmit}
                >
                    <div className={accountStyles.header}>
                        <h2
                            className={accountStyles.title}
                            id="pebble-upload-title"
                        >
                            {updating ? 'Update your project' : 'Share your project'}
                        </h2>
                        <button
                            aria-label="Close"
                            className={accountStyles.close}
                            type="button"
                            onClick={this.handleClose}
                        >
                            {'×'}
                        </button>
                    </div>
                    {content}
                    <input
                        accept="image/*"
                        className={styles.fileInput}
                        ref={this.setFileInput}
                        type="file"
                        onChange={this.handleFileInputChange}
                    />
                </form>
            </div>
        ), document.body);
    }
}

UploadModal.propTypes = {
    projectTitle: PropTypes.string,
    vm: PropTypes.shape({
        renderer: PropTypes.object
    }).isRequired,
    onClose: PropTypes.func.isRequired
};

export default UploadModal;
