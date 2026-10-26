import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';

import {getAvatarURL} from '../../lib/pebble-accounts';
import {getProjectPageURL, getThumbnailURL} from '../../lib/pebble-projects';
import pebbleLogo from '../menu-bar/pebble-logo.svg';
import styles from './projects.css';

const formatCount = (count, one, many) => `${count.toLocaleString()} ${count === 1 ? one : many}`;

/**
 * A user's small profile picture, or the PebbleIDE logo if they don't have one.
 * @param {object} props Props.
 * @returns {React.ReactElement} The picture.
 */
const SmallAvatar = ({username, version}) => {
    const url = getAvatarURL(username, version);
    return (
        <img
            alt=""
            className={classNames(styles.smallAvatar, {[styles.smallAvatarDefault]: !url})}
            src={url || pebbleLogo}
        />
    );
};

SmallAvatar.propTypes = {
    username: PropTypes.string.isRequired,
    version: PropTypes.number
};

/**
 * A project's thumbnail, name and who made it, linking to its page.
 * @param {object} props Props.
 * @returns {React.ReactElement} The card.
 */
const ProjectCard = ({project}) => {
    const thumbnail = getThumbnailURL(project.id, project.thumbnailVersion);
    return (
        <a
            className={classNames(styles.card, {[styles.cardFeatured]: project.featured})}
            href={getProjectPageURL(project.id)}
            title={project.title}
        >
            <img
                alt=""
                className={classNames(styles.thumbnail, {[styles.noThumbnail]: !thumbnail})}
                loading="lazy"
                src={thumbnail || pebbleLogo}
            />
            <div className={styles.cardInfo}>
                <SmallAvatar
                    username={project.author.username}
                    version={project.author.avatarVersion}
                />
                <div className={styles.cardText}>
                    <span className={classNames(styles.cardTitle, {[styles.gold]: project.featured})}>
                        {project.title}
                    </span>
                    <span className={styles.cardMeta}>
                        {`${project.author.username} · ${formatCount(project.upvotes, 'upvote', 'upvotes')}`}
                    </span>
                </div>
            </div>
        </a>
    );
};

ProjectCard.propTypes = {
    project: PropTypes.shape({
        id: PropTypes.number,
        title: PropTypes.string,
        author: PropTypes.shape({
            username: PropTypes.string,
            avatarVersion: PropTypes.number
        }),
        thumbnailVersion: PropTypes.number,
        upvotes: PropTypes.number,
        featured: PropTypes.bool
    }).isRequired
};

export {
    SmallAvatar,
    formatCount
};
export default ProjectCard;
