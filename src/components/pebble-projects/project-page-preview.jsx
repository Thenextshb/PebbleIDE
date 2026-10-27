import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';

import {getProfileURL} from '../../lib/pebble-accounts';
import {getProjectPageURL} from '../../lib/pebble-projects';
import {SaveIcon, UpvoteIcon, ViewIcon} from './icons.jsx';
import {SmallAvatar, formatCount} from './project-card.jsx';
import styles from './projects.css';

// The editor's "See Project Page" view shows the project the way its page on the site looks.
// These are the parts around the stage; render-interface.jsx puts them together.

const formatDate = time => new Date(time).toLocaleDateString([], {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
});

/**
 * Title, who made it and See inside.
 * @param {object} props Props.
 * @returns {React.ReactElement} The header.
 */
const PreviewHeader = ({title, user, project, onSeeInside}) => {
    const username = project ? project.author.username : (user && user.username);
    return (
        <header className={styles.projectHeader}>
            {username && (
                <SmallAvatar
                    big
                    username={username}
                    version={project ? project.author.avatarVersion : user.avatarVersion}
                />
            )}
            <div className={styles.projectHeading}>
                <h1 className={classNames(styles.projectTitle, {[styles.gold]: project && project.featured})}>
                    {title}
                </h1>
                {username && (
                    <div className={styles.projectBy}>
                        {'by '}
                        <a
                            href={getProfileURL(username)}
                            rel="noreferrer"
                            target="_blank"
                        >
                            {username}
                        </a>
                    </div>
                )}
            </div>
            <button
                className={styles.button}
                type="button"
                onClick={onSeeInside}
            >
                {'See inside'}
            </button>
        </header>
    );
};

PreviewHeader.propTypes = {
    project: PropTypes.object, // eslint-disable-line react/forbid-prop-types
    title: PropTypes.string,
    user: PropTypes.object, // eslint-disable-line react/forbid-prop-types
    onSeeInside: PropTypes.func
};

/**
 * Upvotes, saves and views under the stage.
 * @param {object} props Props.
 * @returns {React.ReactElement} The stats.
 */
const PreviewStats = ({project}) => (
    <div className={styles.projectStats}>
        <button
            disabled
            className={styles.stat}
            title="People can upvote it once it's shared"
            type="button"
        >
            <UpvoteIcon />
            {formatCount(project ? project.upvotes : 0, 'upvote', 'upvotes')}
        </button>
        <button
            disabled
            className={styles.stat}
            title="People can save it once it's shared"
            type="button"
        >
            <SaveIcon />
            {'Save'}
        </button>
        <span className={styles.stat}>
            <ViewIcon />
            {formatCount(project ? project.views : 0, 'view', 'views')}
        </span>
        {project && (
            <div className={styles.statsEnd}>
                <a
                    className={classNames(styles.button, styles.small, styles.secondary)}
                    href={getProjectPageURL(project.id)}
                    rel="noreferrer"
                    target="_blank"
                >
                    {'Open real page'}
                </a>
            </div>
        )}
    </div>
);

PreviewStats.propTypes = {
    project: PropTypes.object // eslint-disable-line react/forbid-prop-types
};

/**
 * The description next to the stage.
 * @param {object} props Props.
 * @returns {React.ReactElement} The side.
 */
const PreviewSide = ({project}) => (
    <aside className={styles.projectSide}>
        {project && project.featured && (
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
                {project && project.description ?
                    <p className={styles.description}>{project.description}</p> :
                    <p className={styles.note}>
                        {project ? 'No description.' : 'You can add a description when you upload it.'}
                    </p>}
            </div>
        </section>
        <div className={styles.sideFooter}>
            {project ?
                `Shared ${formatDate(project.created)}` :
                'Not shared yet. Click Upload at the top to share it.'}
        </div>
    </aside>
);

PreviewSide.propTypes = {
    project: PropTypes.object // eslint-disable-line react/forbid-prop-types
};

export {
    PreviewHeader,
    PreviewSide,
    PreviewStats
};
