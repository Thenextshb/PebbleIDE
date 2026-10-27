import bindAll from 'lodash.bindall';
import classNames from 'classnames';
import React from 'react';

import {getProfileURL} from '../../lib/pebble-accounts';
import {getProjectPageURL} from '../../lib/pebble-projects';
import {REPORT_REASONS, listReports, resolveReport} from '../../lib/pebble-reports';
import projectStyles from '../pebble-projects/projects.css';
import styles from './reports.css';

const reasonName = id => (REPORT_REASONS.find(reason => reason.id === id) || {name: id}).name;

const formatTime = time => new Date(time).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
});

/**
 * The PebbleIDE team's list of reports, shown on their own profile.
 */
class ReportsList extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleResolve',
            'handleShowHandled',
            'handleShowOpen'
        ]);
        this.state = {
            handled: false,
            reports: null,
            error: null,
            busy: null
        };
    }
    componentDidMount () {
        this.load();
    }
    componentWillUnmount () {
        this.unmounted = true;
    }
    load () {
        this.setState({reports: null, error: null});
        listReports(this.state.handled)
            .then(reports => {
                if (!this.unmounted) this.setState({reports});
            })
            .catch(error => {
                if (!this.unmounted) this.setState({error: error.message});
            });
    }
    handleShowOpen () {
        this.setState({handled: false}, () => this.load());
    }
    handleShowHandled () {
        this.setState({handled: true}, () => this.load());
    }
    async handleResolve (e) {
        const id = Number(e.currentTarget.dataset.id);
        this.setState({busy: id});
        try {
            await resolveReport(id);
            this.setState({
                busy: null,
                reports: this.state.reports.filter(report => report.id !== id)
            });
        } catch (error) {
            this.setState({busy: null, error: error.message});
        }
    }
    renderWhat (report) {
        if (report.project) {
            return (
                <React.Fragment>
                    {'Project '}
                    <a href={getProjectPageURL(report.project.id)}>{report.project.title}</a>
                    {' by '}
                    <a href={getProfileURL(report.project.owner)}>{report.project.owner}</a>
                </React.Fragment>
            );
        }
        if (report.user) {
            return (
                <React.Fragment>
                    {'User '}
                    <a href={getProfileURL(report.user)}>{report.user}</a>
                </React.Fragment>
            );
        }
        return 'Something that was deleted';
    }
    renderReport (report) {
        return (
            <li
                className={styles.report}
                key={report.id}
            >
                <div className={styles.reportWhat}>{this.renderWhat(report)}</div>
                <div className={styles.reportReason}>{reasonName(report.reason)}</div>
                {report.details && <p className={styles.reportDetails}>{report.details}</p>}
                <div className={styles.reportMeta}>
                    {'Reported by '}
                    <a href={getProfileURL(report.reporter)}>{report.reporter}</a>
                    {` · ${formatTime(report.created)}`}
                    {report.resolved &&
                        ` · Handled by ${report.resolvedBy || 'someone'} ${formatTime(report.resolved)}`}
                </div>
                {!report.resolved && (
                    <button
                        className={classNames(projectStyles.button, projectStyles.small, projectStyles.secondary)}
                        data-id={report.id}
                        disabled={this.state.busy === report.id}
                        type="button"
                        onClick={this.handleResolve}
                    >
                        {'Mark as handled'}
                    </button>
                )}
            </li>
        );
    }
    renderReports () {
        const {reports, error, handled} = this.state;
        if (error) return <p className={projectStyles.note}>{error}</p>;
        if (!reports) return <p className={projectStyles.note}>{'Loading…'}</p>;
        if (reports.length === 0) {
            return <p className={projectStyles.note}>{handled ? 'Nothing handled yet.' : 'No reports right now.'}</p>;
        }
        return <ul className={styles.list}>{reports.map(report => this.renderReport(report))}</ul>;
    }
    render () {
        const {handled} = this.state;
        return (
            <section className={projectStyles.box}>
                <div className={projectStyles.boxHeader}>
                    <h2 className={projectStyles.boxTitle}>{'Reports'}</h2>
                    <div className={styles.tabs}>
                        <button
                            className={classNames(styles.tab, {[styles.tabSelected]: !handled})}
                            type="button"
                            onClick={this.handleShowOpen}
                        >
                            {'Open'}
                        </button>
                        <button
                            className={classNames(styles.tab, {[styles.tabSelected]: handled})}
                            type="button"
                            onClick={this.handleShowHandled}
                        >
                            {'Handled'}
                        </button>
                    </div>
                </div>
                <div className={projectStyles.boxContent}>
                    <p className={projectStyles.note}>{'Only the PebbleIDE team can see this.'}</p>
                    {this.renderReports()}
                </div>
            </section>
        );
    }
}

export default ReportsList;
