import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';

import {PROJECTS_ENABLED, listProjects} from '../../lib/pebble-projects';
import ProjectCard from './project-card.jsx';
import styles from './projects.css';

/**
 * A box of projects, like "Featured" on the home page or someone's projects on their profile.
 */
class ProjectRow extends React.Component {
    constructor (props) {
        super(props);
        this.state = {
            projects: null,
            error: null,
            // False when this copy of the site has no project server
            available: PROJECTS_ENABLED
        };
    }
    componentDidMount () {
        this.load();
    }
    componentDidUpdate (prevProps) {
        if (prevProps.list !== this.props.list || prevProps.query !== this.props.query ||
            prevProps.user !== this.props.user || prevProps.reloadKey !== this.props.reloadKey) {
            this.load();
        }
    }
    componentWillUnmount () {
        this.unmounted = true;
    }
    load () {
        if (!PROJECTS_ENABLED) return;
        const options = {};
        if (this.props.query) options.q = this.props.query;
        if (this.props.user) options.user = this.props.user;
        listProjects(this.props.list, options)
            .then(projects => {
                if (!this.unmounted) this.setState({projects, error: null});
            })
            .catch(error => {
                if (this.unmounted) return;
                if (error.status === 404 || !error.status) this.setState({available: false});
                else this.setState({error: error.message});
            });
    }
    renderProjects () {
        const {projects, error} = this.state;
        if (error) return <p className={styles.sectionNote}>{error}</p>;
        if (!projects) return <p className={styles.sectionNote}>{'Loading…'}</p>;
        if (projects.length === 0) return <p className={styles.sectionNote}>{this.props.emptyText}</p>;
        return (
            <div className={styles.grid}>
                {projects.map(project => (
                    <ProjectCard
                        key={project.id}
                        project={project}
                    />
                ))}
            </div>
        );
    }
    render () {
        if (!this.state.available) return null;
        return (
            <section className={classNames(styles.section, this.props.className)}>
                <h2 className={styles.sectionHeading}>{this.props.title}</h2>
                {this.props.note && <p className={styles.sectionNote}>{this.props.note}</p>}
                {this.renderProjects()}
            </section>
        );
    }
}

ProjectRow.propTypes = {
    className: PropTypes.string,
    emptyText: PropTypes.string.isRequired,
    // featured, wanted, recent, search, user or saved
    list: PropTypes.string.isRequired,
    note: PropTypes.string,
    query: PropTypes.string,
    // Changing this loads the projects again
    reloadKey: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    title: PropTypes.string.isRequired,
    user: PropTypes.string
};

export default ProjectRow;
