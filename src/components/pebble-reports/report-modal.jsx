import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';
import ReactDOM from 'react-dom';

import {REPORT_REASONS, sendReport} from '../../lib/pebble-reports';
import accountStyles from '../pebble-account/account.css';
import styles from './reports.css';

const MAX_DETAILS_LENGTH = 500;

/**
 * The pop-up for reporting a project or a user to the PebbleIDE team.
 */
class ReportModal extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleChange',
            'handleClose',
            'handleKeyDown',
            'handleOverlayMouseDown',
            'handleSubmit'
        ]);
        this.state = {
            reason: null,
            details: '',
            busy: false,
            error: null,
            sent: false
        };
    }
    componentDidMount () {
        document.addEventListener('keydown', this.handleKeyDown);
    }
    componentWillUnmount () {
        this.unmounted = true;
        document.removeEventListener('keydown', this.handleKeyDown);
    }
    handleChange (e) {
        this.setState({[e.target.name]: e.target.value});
    }
    handleClose () {
        if (!this.state.busy) this.props.onClose();
    }
    handleKeyDown (e) {
        if (e.key === 'Escape') this.handleClose();
    }
    handleOverlayMouseDown (e) {
        if (e.target === e.currentTarget) this.handleClose();
    }
    async handleSubmit (e) {
        e.preventDefault();
        const {reason, details, busy} = this.state;
        if (busy) return;
        if (!reason) {
            this.setState({error: 'Pick why you\'re reporting it.'});
            return;
        }
        this.setState({busy: true, error: null});
        try {
            await sendReport({kind: this.props.kind, target: this.props.target, reason, details});
            if (!this.unmounted) this.setState({busy: false, sent: true});
        } catch (error) {
            if (!this.unmounted) this.setState({busy: false, error: error.message});
        }
    }
    renderForm () {
        const {reason, details, busy, error} = this.state;
        return (
            <React.Fragment>
                <p className={accountStyles.text}>
                    {`Why are you reporting ${this.props.name}? Only the PebbleIDE team sees reports.`}
                </p>
                <div className={styles.reasons}>
                    {REPORT_REASONS.map(option => (
                        <label
                            className={styles.reason}
                            key={option.id}
                        >
                            <input
                                checked={reason === option.id}
                                name="reason"
                                type="radio"
                                value={option.id}
                                onChange={this.handleChange}
                            />
                            {option.name}
                        </label>
                    ))}
                </div>
                <label className={accountStyles.field}>
                    <span className={accountStyles.label}>{'Anything else we should know? (optional)'}</span>
                    <textarea
                        className={`${accountStyles.input} ${styles.details}`}
                        maxLength={MAX_DETAILS_LENGTH}
                        name="details"
                        value={details}
                        onChange={this.handleChange}
                    />
                </label>
                {error && (
                    <p
                        className={accountStyles.error}
                        role="alert"
                    >
                        {error}
                    </p>
                )}
                <button
                    className={accountStyles.submit}
                    disabled={busy}
                    type="submit"
                >
                    {busy ? 'Sending…' : 'Send report'}
                </button>
            </React.Fragment>
        );
    }
    render () {
        return ReactDOM.createPortal((
            <div
                className={accountStyles.overlay}
                onMouseDown={this.handleOverlayMouseDown}
            >
                <form
                    noValidate
                    aria-labelledby="pebble-report-title"
                    aria-modal="true"
                    className={accountStyles.dialog}
                    role="dialog"
                    onSubmit={this.handleSubmit}
                >
                    <div className={accountStyles.header}>
                        <h2
                            className={accountStyles.title}
                            id="pebble-report-title"
                        >
                            {this.props.kind === 'project' ? 'Report this project' : 'Report this user'}
                        </h2>
                        <button
                            aria-label="Close"
                            className={accountStyles.close}
                            type="button"
                            onClick={this.handleClose}
                        >
                            {'×'}
                        </button>
                    </div>
                    <div className={accountStyles.body}>
                        {this.state.sent ? (
                            <React.Fragment>
                                <p
                                    className={accountStyles.notice}
                                    role="status"
                                >
                                    {'Thanks for telling us. The PebbleIDE team will take a look.'}
                                </p>
                                <button
                                    className={accountStyles.submit}
                                    type="button"
                                    onClick={this.handleClose}
                                >
                                    {'OK'}
                                </button>
                            </React.Fragment>
                        ) : this.renderForm()}
                    </div>
                </form>
            </div>
        ), document.body);
    }
}

ReportModal.propTypes = {
    // "project" or "user"
    kind: PropTypes.oneOf(['project', 'user']).isRequired,
    // What it's called, for "Why are you reporting ...?"
    name: PropTypes.string.isRequired,
    // The project's number, or the user's username
    target: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    onClose: PropTypes.func.isRequired
};

export default ReportModal;
