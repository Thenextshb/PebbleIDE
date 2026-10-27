import bindAll from 'lodash.bindall';
import classNames from 'classnames';
import PropTypes from 'prop-types';
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
import SiteFooter from '../pebble-home/site-footer.jsx';
import AccountModal from '../pebble-account/account-modal.jsx';
import ReportModal from '../pebble-reports/report-modal.jsx';
import {SaveIcon, UpvoteIcon, ViewIcon} from './icons.jsx';
import {SmallAvatar, formatCount} from './project-card.jsx';
import ProjectRow from './project-row.jsx';

import homeStyles from '../pebble-home/home.css';
import styles from './projects.css';
import reportStyles from '../pebble-reports/reports.css';

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
            'handleCloseReport',
            'handleCloseSignIn',
            'handleCopyLink',
            'handleReport',
            'handleDelete',
            'handleSave',
            'handleUpvote',
            'handleUserChange'
        ]);
        this.state = {
            id: props.id,
            project: null,
            notFound: false,
            loadError: null,
            busy: null,
            message: null,
            messageIsError: false,
            signingIn: false,
            reporting: false
        };
    }
    componentDidMount () {
        this.stopListening = onUserChange(this.handleUserChange);
        loadUser();
        window.scrollTo(0, 0);
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
    handleReport () {
        // Reporting needs an account
        if (getUser()) this.setState({reporting: true});
        else this.setState({signingIn: true});
    }
    handleCloseReport () {
        this.setState({reporting: false});
    }
    renderOwnerNote () {
        const {project} = this.state;
        if (!project.isOwner) return null;
        const minutes = Math.ceil((project.nextChangeAt - Date.now()) / 60000);
        return (
            <p className={styles.note}>
                {'To change it, click See inside, then Upload in the editor. '}
                {minutes > 0 ?
                    `You can change it again in ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}.` :
                    'Projects can be changed once every 10 minutes.'}
            </p>
        );
    }
    renderProject () {
        const {project, busy, message, messageIsError} = this.state;
        const username = project.author.username;
        return (
            <React.Fragment>
                <div className={styles.projectLayout}>
                    <header className={styles.projectHeader}>
                        <a
                            href={getProfileURL(username)}
                            tabIndex={-1}
                        >
                            <SmallAvatar
                                big
                                username={username}
                                version={project.author.avatarVersion}
                            />
                        </a>
                        <div className={styles.projectHeading}>
                            <h1 className={classNames(styles.projectTitle, {[styles.gold]: project.featured})}>
                                {project.title}
                            </h1>
                            <div className={styles.projectBy}>
                                {'by '}
                                <a href={getProfileURL(username)}>{username}</a>
                            </div>
                        </div>
                        <a
                            className={styles.button}
                            href={getEditorURL(project.id)}
                        >
                            {'See inside'}
                        </a>
                    </header>
                    <div className={styles.player}>
                        <iframe
                            allowFullScreen
                            allow="autoplay; fullscreen; gamepad"
                            className={styles.playerFrame}
                            src={getEmbedURL(project.id)}
                            title={project.title}
                        />
                    </div>
                    <div className={styles.projectStats}>
                        <button
                            aria-pressed={project.youUpvoted}
                            className={classNames(styles.stat, {[styles.upvoted]: project.youUpvoted})}
                            disabled={busy === 'upvote' || project.isOwner}
                            title={project.isOwner ? 'You can\'t upvote your own project' : 'Upvote'}
                            type="button"
                            onClick={this.handleUpvote}
                        >
                            <UpvoteIcon />
                            {formatCount(project.upvotes, 'upvote', 'upvotes')}
                        </button>
                        <button
                            aria-pressed={project.youSaved}
                            className={classNames(styles.stat, {[styles.saved]: project.youSaved})}
                            disabled={busy === 'save'}
                            type="button"
                            onClick={this.handleSave}
                        >
                            <SaveIcon />
                            {project.youSaved ? 'Saved' : 'Save'}
                        </button>
                        <span className={styles.stat}>
                            <ViewIcon />
                            {formatCount(project.views, 'view', 'views')}
                        </span>
                        <div className={styles.statsEnd}>
                            <button
                                className={classNames(styles.button, styles.small, styles.secondary)}
                                type="button"
                                onClick={this.handleCopyLink}
                            >
                                {'Copy link'}
                            </button>
                        </div>
                    </div>
                    <aside className={styles.projectSide}>
                        {project.featured && (
                            <div className={styles.featuredBanner}>
                                <SaveIcon />
                                {'Featured project'}
                            </div>
                        )}
                        <section className={styles.box}>
                            <div className={styles.boxHeader}>
                                <h2 className={styles.boxTitle}>{'About this project'}</h2>
                            </div>
                            <div className={styles.boxContent}>
                                {project.description ?
                                    <p className={styles.description}>{project.description}</p> :
                                    <p className={styles.note}>{'No description.'}</p>}
                            </div>
                        </section>
                        {this.renderOwnerNote()}
                        {message && (
                            <p
                                className={classNames(styles.message, {[styles.messageError]: messageIsError})}
                                role={messageIsError ? 'alert' : 'status'}
                            >
                                {message}
                            </p>
                        )}
                        <div className={styles.sideFooter}>
                            <span>{`Shared ${formatDate(project.created)}`}</span>
                            {!project.isOwner && (
                                <button
                                    className={reportStyles.reportButton}
                                    type="button"
                                    onClick={this.handleReport}
                                >
                                    {'⚑ Report this project'}
                                </button>
                            )}
                        </div>
                        {project.canDelete && (
                            <div>
                                <button
                                    className={classNames(styles.button, styles.small, styles.danger)}
                                    disabled={busy === 'delete'}
                                    type="button"
                                    onClick={this.handleDelete}
                                >
                                    {'Delete project'}
                                </button>
                            </div>
                        )}
                    </aside>
                </div>
                <ProjectRow
                    hideWhenEmpty
                    emptyText=""
                    hideProject={project.id}
                    list="user"
                    title={`More projects by ${username}`}
                    user={username}
                />
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
                <SiteFooter />
                {this.state.signingIn && (
                    <AccountModal
                        mode="sign-in"
                        onClose={this.handleCloseSignIn}
                    />
                )}
                {this.state.reporting && this.state.project && (
                    <ReportModal
                        kind="project"
                        name={`"${this.state.project.title}"`}
                        target={this.state.project.id}
                        onClose={this.handleCloseReport}
                    />
                )}
            </div>
        );
    }
}

ProjectPage.propTypes = {
    id: PropTypes.string.isRequired
};

export default ProjectPage;
