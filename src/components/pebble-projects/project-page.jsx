import bindAll from 'lodash.bindall';
import classNames from 'classnames';
import React from 'react';

import {APP_NAME} from '../../lib/brand';
import {getProfileURL, getUser, loadUser, onUserChange} from '../../lib/pebble-accounts';
import {
    countView,
    deleteProject,
    getEditorURL,
    getEmbedURL,
    getProject,
    getProjectPageURL,
    setSaved,
    setUpvoted
} from '../../lib/pebble-projects';
import SiteBar from '../pebble-home/site-bar.jsx';
import AccountModal from '../pebble-account/account-modal.jsx';
import {SmallAvatar, formatCount} from './project-card.jsx';

import homeStyles from '../pebble-home/home.css';
import styles from './projects.css';

// [] uses the browser's own language
const formatDate = time => new Date(time).toLocaleDateString([], {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
});

/**
 * A shared project's page: the project to play, who made it, its description, upvotes and views.
 */
class ProjectPage extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleCloseSignIn',
            'handleCopyLink',
            'handleDelete',
            'handleSave',
            'handleUpvote',
            'handleUserChange'
        ]);
        const id = new URLSearchParams(location.search).get('id');
        this.state = {
            id,
            project: null,
            notFound: !id,
            loadError: null,
            busy: null,
            message: null,
            messageIsError: false,
            signingIn: false
        };
    }
    componentDidMount () {
        this.stopListening = onUserChange(this.handleUserChange);
        loadUser();
        if (!this.state.id) return;
        this.load().then(() => countView(this.state.id))
            .then(views => {
                if (this.state.project) this.setState({project: {...this.state.project, views}});
            })
            .catch(() => {
                // The page works without counting the view
            });
    }
    componentWillUnmount () {
        this.stopListening();
    }
    load () {
        return getProject(this.state.id)
            .then(project => {
                document.title = `${project.title} - ${APP_NAME}`;
                this.setState({project});
            })
            .catch(error => {
                if (error.code === 'no-project') this.setState({notFound: true});
                else this.setState({loadError: error.message});
            });
    }
    handleUserChange () {
        // Signed in or out, so whether you upvoted or saved it may have changed
        if (this.state.project) this.load();
    }
    async run (name, task, doneMessage) {
        if (!getUser()) {
            this.setState({signingIn: true});
            return;
        }
        this.setState({busy: name, message: null});
        try {
            const project = await task();
            this.setState({busy: null, message: doneMessage, messageIsError: false});
            if (project) this.setState({project});
        } catch (error) {
            this.setState({busy: null, message: error.message, messageIsError: true});
        }
    }
    handleUpvote () {
        const {project} = this.state;
        this.run('upvote', () => setUpvoted(project.id, !project.youUpvoted), null);
    }
    handleSave () {
        const {project} = this.state;
        this.run('save', () => setSaved(project.id, !project.youSaved),
            project.youSaved ? null : 'Saved! You can find it on your profile.');
    }
    handleCopyLink () {
        const link = getProjectPageURL(this.state.project.id);
        navigator.clipboard.writeText(link)
            .then(() => this.setState({message: 'Link copied.', messageIsError: false}))
            .catch(() => this.setState({message: link, messageIsError: false}));
    }
    handleDelete () {
        const {project} = this.state;
        // eslint-disable-next-line no-alert
        if (!confirm(`Delete "${project.title}"? This can't be undone.`)) return;
        this.run('delete', async () => {
            await deleteProject(project.id);
            location.href = getProfileURL(project.author.username);
        }, null);
    }
    handleCloseSignIn () {
        this.setState({signingIn: false});
    }
    renderOwnerNote () {
        const {project} = this.state;
        if (!project.isOwner) return null;
        const minutes = Math.ceil((project.nextChangeAt - Date.now()) / 60000);
        return (
            <p className={styles.sectionNote}>
                {'To change it, click See inside, then Upload in the editor. '}
                {minutes > 0 ?
                    `You can change it again in ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}.` :
                    'Projects can be changed once every 10 minutes.'}
            </p>
        );
    }
    renderProject () {
        const {project, busy, message, messageIsError} = this.state;
        return (
            <React.Fragment>
                <header className={styles.projectHeader}>
                    <h1 className={classNames(styles.projectTitle, {[styles.gold]: project.featured})}>
                        {project.title}
                    </h1>
                    <a
                        className={styles.author}
                        href={getProfileURL(project.author.username)}
                    >
                        <SmallAvatar
                            username={project.author.username}
                            version={project.author.avatarVersion}
                        />
                        {project.author.username}
                    </a>
                </header>
                <div className={styles.projectLayout}>
                    <div className={styles.player}>
                        <iframe
                            allowFullScreen
                            allow="autoplay; fullscreen; gamepad"
                            className={styles.playerFrame}
                            src={getEmbedURL(project.id)}
                            title={project.title}
                        />
                    </div>
                    <aside className={styles.section}>
                        {project.featured && <span className={styles.featuredBadge}>{'Featured'}</span>}
                        <div className={styles.actions}>
                            <button
                                className={classNames(styles.button, {[styles.upvoted]: project.youUpvoted})}
                                disabled={busy === 'upvote' || project.isOwner}
                                title={project.isOwner ? 'You can\'t upvote your own project' : 'Upvote'}
                                type="button"
                                onClick={this.handleUpvote}
                            >
                                {`▲ ${project.youUpvoted ? 'Upvoted' : 'Upvote'}`}
                            </button>
                            <button
                                className={classNames(styles.button, {[styles.saved]: project.youSaved})}
                                disabled={busy === 'save'}
                                type="button"
                                onClick={this.handleSave}
                            >
                                {`★ ${project.youSaved ? 'Saved' : 'Save'}`}
                            </button>
                        </div>
                        <div className={styles.actions}>
                            <a
                                className={classNames(styles.button, styles.primary)}
                                href={getEditorURL(project.id)}
                            >
                                {'See inside'}
                            </a>
                            <button
                                className={styles.button}
                                type="button"
                                onClick={this.handleCopyLink}
                            >
                                {'Copy link'}
                            </button>
                        </div>
                        <p className={styles.stats}>
                            <span><strong>{formatCount(project.views, 'view', 'views')}</strong></span>
                            <span><strong>{formatCount(project.upvotes, 'upvote', 'upvotes')}</strong></span>
                        </p>
                        <p className={styles.sectionNote}>{`Shared ${formatDate(project.created)}`}</p>
                        {this.renderOwnerNote()}
                        {project.canDelete && (
                            <div className={styles.actions}>
                                <button
                                    className={classNames(styles.button, styles.danger)}
                                    disabled={busy === 'delete'}
                                    type="button"
                                    onClick={this.handleDelete}
                                >
                                    {'Delete project'}
                                </button>
                            </div>
                        )}
                        {message && (
                            <p
                                className={classNames(styles.message, {[styles.messageError]: messageIsError})}
                                role={messageIsError ? 'alert' : 'status'}
                            >
                                {message}
                            </p>
                        )}
                    </aside>
                </div>
                <section className={styles.section}>
                    <h2 className={styles.sectionHeading}>{'About this project'}</h2>
                    {project.description ?
                        <p className={styles.description}>{project.description}</p> :
                        <p className={styles.sectionNote}>{'No description.'}</p>}
                </section>
            </React.Fragment>
        );
    }
    renderContent () {
        const {project, notFound, loadError} = this.state;
        if (notFound) return <p className={styles.empty}>{'This project doesn\'t exist, or it was deleted.'}</p>;
        if (loadError) return <p className={styles.empty}>{loadError}</p>;
        if (!project) return <p className={styles.empty}>{'Loading…'}</p>;
        return this.renderProject();
    }
    render () {
        return (
            <div className={homeStyles.page}>
                <SiteBar />
                <main className={styles.pageMain}>
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

export default ProjectPage;
