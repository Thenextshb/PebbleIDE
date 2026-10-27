import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';

import {getAvatarURL, getProfileURL} from '../../lib/pebble-accounts';
import {getProjectPageURL, getThumbnailURL} from '../../lib/pebble-projects';
import pebbleLogo from '../menu-bar/pebble-logo.svg';
import styles from './projects.css';

const formatCount = (count, one, many) => `${count.toLocaleString()} ${count === 1 ? one : many}`;

/**
 * A user's small profile picture, or the PebbleIDE logo if they don't have one.
 * @param {object} props Props.
 * @returns {React.ReactElement} The picture.
 */
const SmallAvatar = ({big, username, version}) => {
    const url = getAvatarURL(username, version);
    return (
        <img
            alt=""
            className={classNames(styles.smallAvatar, {
                [styles.smallAvatarDefault]: !url,
                [styles.bigAvatar]: big
            })}
            src={url || pebbleLogo}
        />
    );
};

SmallAvatar.propTypes = {
    big: PropTypes.bool,
    username: PropTypes.string.isRequired,
    version: PropTypes.number
};

/**
 * A project's thumbnail with who made it and its name under it, like Scratch's.
 * @param {object} props Props.
 * @returns {React.ReactElement} The thumbnail.
 */
const ProjectCard = ({project}) => {
    const thumbnail = getThumbnailURL(project.id, project.thumbnailVersion);
    const pageURL = getProjectPageURL(project.id);
    const profileURL = getProfileURL(project.author.username);
    return (
        <div className={styles.thumb}>
            <a
                className={styles.thumbLink}
                href={pageURL}
                tabIndex={-1}
            >
                <img
                    alt=""
                    className={classNames(styles.thumbnail, {[styles.noThumbnail]: !thumbnail})}
                    loading="lazy"
                    src={thumbnail || pebbleLogo}
                />
            </a>
            <div className={styles.thumbInfo}>
                <a
                    href={profileURL}
                    tabIndex={-1}
                >
                    <SmallAvatar
                        username={project.author.username}
                        version={project.author.avatarVersion}
                    />
                </a>
                <div className={styles.thumbText}>
                    <a
                        className={classNames(styles.thumbTitle, {[styles.gold]: project.featured})}
                        href={pageURL}
                        title={project.title}
                    >
                        {project.title}
                    </a>
                    <span className={styles.thumbMeta}>
                        <a href={profileURL}>{project.author.username}</a>
                        {` · ▲ ${project.upvotes.toLocaleString()}`}
                    </span>
                </div>
            </div>
        </div>
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
