import './import-first';

import bindAll from 'lodash.bindall';
import React from 'react';
import render from './app-target';
import Home from '../components/pebble-home/home.jsx';
import ProjectPage from '../components/pebble-projects/project-page.jsx';

// Shared projects' pages are at the home page's address with the project's number, like /#1773248604
const getProjectId = () => {
    const match = location.hash.match(/^#(\d+)$/);
    return match ? match[1] : null;
};

const homeTitle = document.title;

class HomeOrProject extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, ['handleHashChange']);
        this.state = {projectId: getProjectId()};
    }
    componentDidMount () {
        window.addEventListener('hashchange', this.handleHashChange);
    }
    componentWillUnmount () {
        window.removeEventListener('hashchange', this.handleHashChange);
    }
    handleHashChange () {
        const projectId = getProjectId();
        if (!projectId) document.title = homeTitle;
        this.setState({projectId});
    }
    render () {
        const {projectId} = this.state;
        return projectId ? (
            <ProjectPage
                id={projectId}
                key={projectId}
            />
        ) : <Home />;
    }
}

render(<HomeOrProject />);
