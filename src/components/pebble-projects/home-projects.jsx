import React from 'react';

import {PROJECTS_ENABLED} from '../../lib/pebble-projects';
import ProjectRow from './project-row.jsx';
import styles from './projects.css';

/**
 * @returns {string} What's being searched for on the home page, from the search bar.
 */
const getSearchQuery = () => (new URLSearchParams(location.search).get('q') || '').trim();

/**
 * Projects on the home page: Featured and What people want featured, or search results.
 * @returns {?React.ReactElement} The projects.
 */
const HomeProjects = () => {
    if (!PROJECTS_ENABLED) return null;
    const query = getSearchQuery();
    if (query) {
        return (
            <div className={styles.homeSections}>
                <ProjectRow
                    emptyText="No projects match that. Try other words."
                    list="search"
                    query={query}
                    title={`Projects matching "${query}"`}
                />
            </div>
        );
    }
    return (
        <div className={styles.homeSections}>
            <ProjectRow
                emptyText="No featured projects yet. Projects show up here once they get 25 upvotes."
                list="featured"
                note="Projects with 25 or more upvotes."
                title="Featured"
            />
            <ProjectRow
                emptyText="No projects shared yet. Make one and click Upload in the editor!"
                list="wanted"
                note="Upvote the projects you like. Each upvote gives a project a better chance of showing up here."
                title="What people want featured"
            />
            <ProjectRow
                emptyText="No projects shared yet."
                list="recent"
                note="Just shared."
                title="Newest projects"
            />
        </div>
    );
};

export {
    getSearchQuery
};
export default HomeProjects;
