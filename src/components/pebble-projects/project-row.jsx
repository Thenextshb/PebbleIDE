import bindAll from 'lodash.bindall';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';

import {PROJECTS_ENABLED, listProjects} from '../../lib/pebble-projects';
import {ArrowIcon} from './icons.jsx';
import ProjectCard from './project-card.jsx';
import styles from './projects.css';

/**
 * A box of projects, like "Featured" on the home page or someone's projects on their profile.
 * They're in a row that scrolls sideways like Scratch's, or in a grid for search results.
 */
class ProjectRow extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleScrollLeft',
            'handleScroll',
            'handleScrollRight',
            'setCarousel',
            'updateArrows'
        ]);
        this.state = {
            projects: null,
            error: null,
            // False when this copy of the site has no project server
            available: PROJECTS_ENABLED,
            canScrollLeft: false,
            canScrollRight: false
        };
    }
    componentDidMount () {
        this.load();
        window.addEventListener('resize', this.updateArrows);
    }
    componentDidUpdate (prevProps, prevState) {
        if (prevProps.list !== this.props.list || prevProps.query !== this.props.query ||
            prevProps.user !== this.props.user || prevProps.reloadKey !== this.props.reloadKey) {
            this.load();
        }
        if (prevState.projects !== this.state.projects) this.updateArrows();
    }
    componentWillUnmount () {
        this.unmounted = true;
        window.removeEventListener('resize', this.updateArrows);
    }
    setCarousel (element) {
        this.carousel = element;
    }
    load () {
        if (!PROJECTS_ENABLED) return;
        const options = {};
        if (this.props.query) options.q = this.props.query;
        if (this.props.user) options.user = this.props.user;
        listProjects(this.props.list, options)
            .then(projects => {
                if (this.unmounted) return;
                const shown = projects.filter(project => project.id !== this.props.hideProject);
                this.setState({projects: shown, error: null});
            })
            .catch(error => {
                if (this.unmounted) return;
                if (error.status === 404 || !error.status) this.setState({available: false});
                else this.setState({error: error.message});
            });
    }
    // Only show the arrows when there's more to see that way
    updateArrows () {
        const carousel = this.carousel;
        if (!carousel) return;
        const canScrollLeft = carousel.scrollLeft > 1;
        const canScrollRight = carousel.scrollLeft + carousel.clientWidth < carousel.scrollWidth - 1;
        if (canScrollLeft !== this.state.canScrollLeft || canScrollRight !== this.state.canScrollRight) {
            this.setState({canScrollLeft, canScrollRight});
        }
    }
    scrollBy (direction) {
        this.carousel.scrollBy({left: direction * this.carousel.clientWidth * 0.8});
    }
    handleScroll () {
        this.updateArrows();
    }
    handleScrollLeft () {
        this.scrollBy(-1);
    }
    handleScrollRight () {
        this.scrollBy(1);
    }
    renderCards () {
        return this.state.projects.map(project => (
            <ProjectCard
                key={project.id}
                project={project}
            />
        ));
    }
    renderProjects () {
        const {projects, error, canScrollLeft, canScrollRight} = this.state;
        if (error) return <p className={styles.note}>{error}</p>;
        if (!projects) return <p className={styles.note}>{'Loading…'}</p>;
        if (projects.length === 0) return <p className={styles.note}>{this.props.emptyText}</p>;
        if (this.props.grid) return <div className={styles.grid}>{this.renderCards()}</div>;
        return (
            <div className={styles.carouselArea}>
                {canScrollLeft && (
                    <button
                        aria-label="Scroll left"
                        className={classNames(styles.arrow, styles.arrowLeft)}
                        type="button"
                        onClick={this.handleScrollLeft}
                    >
                        <ArrowIcon left />
                    </button>
                )}
                <div
                    className={styles.carousel}
                    ref={this.setCarousel}
                    onScroll={this.handleScroll}
                >
                    {this.renderCards()}
                </div>
                {canScrollRight && (
                    <button
                        aria-label="Scroll right"
                        className={classNames(styles.arrow, styles.arrowRight)}
                        type="button"
                        onClick={this.handleScrollRight}
                    >
                        <ArrowIcon />
                    </button>
                )}
            </div>
        );
    }
    render () {
        const {available, projects} = this.state;
        if (!available) return null;
        // Nothing else by this person, so there's nothing to show
        if (this.props.hideWhenEmpty && projects && projects.length === 0) return null;
        return (
            <section className={classNames(styles.box, this.props.className)}>
                <div className={styles.boxHeader}>
                    <h2 className={styles.boxTitle}>
                        {this.props.title}
                        {projects && projects.length > 0 && this.props.showCount && ` (${projects.length})`}
                    </h2>
                    {this.props.note && <span className={styles.boxNote}>{this.props.note}</span>}
                </div>
                <div className={styles.boxContent}>
                    {this.renderProjects()}
                </div>
            </section>
        );
    }
}

ProjectRow.propTypes = {
    className: PropTypes.string,
    emptyText: PropTypes.string.isRequired,
    // A grid instead of a row that scrolls sideways
    grid: PropTypes.bool,
    hideProject: PropTypes.number,
    hideWhenEmpty: PropTypes.bool,
    // featured, wanted, recent, search, user or saved
    list: PropTypes.string.isRequired,
    note: PropTypes.string,
    query: PropTypes.string,
    // Changing this loads the projects again
    reloadKey: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    showCount: PropTypes.bool,
    title: PropTypes.string.isRequired,
    user: PropTypes.string
};

export default ProjectRow;
