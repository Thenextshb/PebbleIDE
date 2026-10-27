import React from 'react';

import {PROJECTS_ENABLED} from '../../lib/pebble-projects';
import ProjectRow from './project-row.jsx';

/**
 * @returns {string} What's being searched for on the home page, from the search bar.
 */
const getSearchQuery = () => (new URLSearchParams(location.search).get('q') || '').trim();

/**
 * Projects on the home page: Featured, What people want featured and Newest projects, or search results.
 * @returns {?React.ReactElement} The projects.
 */
const HomeProjects = () => {
    if (!PROJECTS_ENABLED) return null;
    const query = getSearchQuery();
    if (query) {
        return (
            <ProjectRow
                grid
                emptyText="No projects match that. Try other words."
                list="search"
                query={query}
                title={`Projects matching "${query}"`}
            />
        );
    }
    return (
        <React.Fragment>
            <ProjectRow
                emptyText="No featured projects yet. Projects show up here once they get 25 upvotes."
                list="featured"
                note="Projects with 25 or more upvotes"
                title="Featured Projects"
            />
            <ProjectRow
                emptyText="No projects shared yet. Make one and click Upload in the editor!"
                list="wanted"
                note="Upvote the ones you like to help them get featured"
                title="What People Want Featured"
            />
            <ProjectRow
                emptyText="No projects shared yet."
                list="recent"
                note="Just shared"
                title="Newest Projects"
            />
        </React.Fragment>
    );
};

export {
    getSearchQuery
};
export default HomeProjects;
