import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';
import ReactDOM from 'react-dom';

import {
    forgotPassword,
    getTurnstileSiteKey,
    loadTurnstile,
    resetPassword,
    signIn,
    signUp,
    verifyEmail
} from '../../lib/pebble-accounts';
import styles from './account.css';

const TITLES = {
    'sign-in': 'Sign in',
    'sign-up': 'Create an account',
    'forgot': 'Forgot your password?',
    'reset': 'Pick a new password',
    'verify': 'Verify your email'
};
const BUTTONS = {
    'sign-in': 'Sign in',
    'sign-up': 'Create account',
    'forgot': 'Send me a link',
    'reset': 'Save new password'
};
const NEEDS_ROBOT_CHECK = ['sign-in', 'sign-up', 'forgot'];

// Turnstile has a light and a dark look; pick the one that matches the window behind it
const getTurnstileTheme = element => {
    const [red, green, blue] = (getComputedStyle(element).backgroundColor.match(/\d+/g) || [255, 255, 255])
        .map(Number);
    return ((0.299 * red) + (0.587 * green) + (0.114 * blue)) < 128 ? 'dark' : 'light';
};

/**
 * The window for signing in, creating an account and getting back into an account.
 */
class AccountModal extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleChange',
            'handleClose',
            'handleKeyDown',
            'handleOverlayMouseDown',
            'handleSubmit',
            'handleSwitchMode',
            'setDialog',
            'setRobotCheck'
        ]);
        this.state = {
            mode: props.mode,
            username: '',
            email: '',
            password: '',
            error: null,
            notice: null,
            busy: false,
            turnstileToken: null
        };
        this.turnstileId = null;
    }
    componentDidMount () {
        document.addEventListener('keydown', this.handleKeyDown);
        this.showRobotCheck();
        if (this.state.mode === 'verify') {
            this.verify();
        }
    }
    componentDidUpdate (prevProps, prevState) {
        if (prevState.mode !== this.state.mode) {
            this.showRobotCheck();
        }
    }
    componentWillUnmount () {
        this.unmounted = true;
        document.removeEventListener('keydown', this.handleKeyDown);
        this.removeRobotCheck();
    }
    setDialog (element) {
        this.dialog = element;
    }
    setRobotCheck (element) {
        this.robotCheck = element;
    }
    showRobotCheck () {
        this.removeRobotCheck();
        const mode = this.state.mode;
        if (!NEEDS_ROBOT_CHECK.includes(mode)) return;
        const sitekey = getTurnstileSiteKey();
        if (!sitekey) {
            this.setState({error: 'Accounts aren\'t set up on this site yet.'});
            return;
        }
        loadTurnstile()
            .then(turnstile => {
                if (this.unmounted || this.state.mode !== mode || !this.robotCheck) return;
                this.turnstileId = turnstile.render(this.robotCheck, {
                    'sitekey': sitekey,
                    'theme': getTurnstileTheme(this.dialog),
                    'size': 'flexible',
                    'callback': token => this.setState({turnstileToken: token}),
                    'expired-callback': () => this.setState({turnstileToken: null}),
                    'error-callback': () => this.setState({turnstileToken: null})
                });
            })
            .catch(error => {
                if (!this.unmounted) this.setState({error: error.message});
            });
    }
    // Opened from a "verify your email" email
    async verify () {
        this.setState({busy: true});
        try {
            await verifyEmail(this.props.token);
            if (this.unmounted) return;
            this.setState({
                busy: false,
                notice: 'Your email is verified! Now you can change your bio and profile picture.'
            });
        } catch (error) {
            if (!this.unmounted) this.setState({busy: false, error: error.message});
        }
    }
    removeRobotCheck () {
        if (this.turnstileId !== null && window.turnstile) {
            window.turnstile.remove(this.turnstileId);
        }
        this.turnstileId = null;
    }
    // Each robot check can only be used once
    resetRobotCheck () {
        if (this.turnstileId !== null && window.turnstile) {
            window.turnstile.reset(this.turnstileId);
        }
        this.setState({turnstileToken: null});
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
    handleSwitchMode (e) {
        this.setState({
            mode: e.currentTarget.dataset.mode,
            error: null,
            notice: null,
            password: '',
            turnstileToken: null
        });
    }
    async handleSubmit (e) {
        e.preventDefault();
        if (this.state.busy) return;
        const {mode, username, email, password, turnstileToken} = this.state;
        if (NEEDS_ROBOT_CHECK.includes(mode) && !turnstileToken) {
            this.setState({error: 'Please finish the robot check first.'});
            return;
        }
        this.setState({busy: true, error: null});
        try {
            if (mode === 'sign-in') {
                await signIn({username, password, turnstile: turnstileToken});
            } else if (mode === 'sign-up') {
                await signUp({username, email, password, turnstile: turnstileToken});
            } else if (mode === 'forgot') {
                await forgotPassword({email, turnstile: turnstileToken});
                this.removeRobotCheck();
                this.setState({
                    busy: false,
                    notice: 'If there\'s an account with that email, we sent it a link for picking a new password. ' +
                        'Check your inbox (and spam folder). The link works for 1 hour.'
                });
                return;
            } else if (mode === 'reset') {
                await resetPassword({token: this.props.token, password});
                this.setState({busy: false, notice: 'Your password is changed, and you\'re signed in.'});
                return;
            }
            this.props.onClose();
        } catch (error) {
            if (this.unmounted) return;
            this.setState({busy: false, error: error.message});
            if (NEEDS_ROBOT_CHECK.includes(mode)) this.resetRobotCheck();
        }
    }
    renderField ({name, label, type = 'text', autoComplete, hint}) {
        return (
            <label className={styles.field}>
                <span className={styles.label}>{label}</span>
                <input
                    autoCapitalize="off"
                    autoComplete={autoComplete}
                    className={styles.input}
                    name={name}
                    spellCheck={false}
                    type={type}
                    value={this.state[name]}
                    onChange={this.handleChange}
                />
                {hint && <span className={styles.hint}>{hint}</span>}
            </label>
        );
    }
    renderModeLink (mode, text) {
        return (
            <button
                className={styles.link}
                data-mode={mode}
                type="button"
                onClick={this.handleSwitchMode}
            >
                {text}
            </button>
        );
    }
    renderFields () {
        const {mode} = this.state;
        if (mode === 'sign-in') {
            return (
                <React.Fragment>
                    {this.renderField({name: 'username', label: 'Username or email', autoComplete: 'username'})}
                    {this.renderField({
                        name: 'password',
                        label: 'Password',
                        type: 'password',
                        autoComplete: 'current-password'
                    })}
                </React.Fragment>
            );
        }
        if (mode === 'sign-up') {
            return (
                <React.Fragment>
                    {this.renderField({
                        name: 'username',
                        label: 'Username',
                        autoComplete: 'username',
                        hint: '3 to 20 letters, numbers, - or _. Everyone can see it.'
                    })}
                    {this.renderField({
                        name: 'email',
                        label: 'Email',
                        type: 'email',
                        autoComplete: 'email',
                        hint: 'Only used to help you get back into your account. Nobody else sees it.'
                    })}
                    {this.renderField({
                        name: 'password',
                        label: 'Password',
                        type: 'password',
                        autoComplete: 'new-password',
                        hint: 'At least 8 characters.'
                    })}
                </React.Fragment>
            );
        }
        if (mode === 'forgot') {
            return (
                <React.Fragment>
                    <p className={styles.text}>
                        {'Type the email you made your account with, ' +
                            'and we\'ll send you a link to pick a new password.'}
                    </p>
                    {this.renderField({name: 'email', label: 'Email', type: 'email', autoComplete: 'email'})}
                </React.Fragment>
            );
        }
        if (mode === 'reset') {
            return this.renderField({
                name: 'password',
                label: 'New password',
                type: 'password',
                autoComplete: 'new-password',
                hint: 'At least 8 characters.'
            });
        }
        return this.state.busy ? <p className={styles.text}>{'Checking your link…'}</p> : null;
    }
    renderLinks () {
        const {mode} = this.state;
        if (mode === 'sign-in') {
            return (
                <div className={styles.links}>
                    {this.renderModeLink('forgot', 'Forgot your password?')}
                    {this.renderModeLink('sign-up', 'New here? Create an account')}
                </div>
            );
        }
        if (mode === 'sign-up') {
            return (
                <div className={styles.links}>
                    {this.renderModeLink('sign-in', 'Already have an account? Sign in')}
                </div>
            );
        }
        if (mode === 'forgot') {
            return (
                <div className={styles.links}>
                    {this.renderModeLink('sign-in', 'Back to sign in')}
                </div>
            );
        }
        return null;
    }
    render () {
        const {mode, error, notice, busy} = this.state;
        return ReactDOM.createPortal((
            <div
                className={styles.overlay}
                onMouseDown={this.handleOverlayMouseDown}
            >
                <form
                    noValidate
                    aria-labelledby="pebble-account-title"
                    aria-modal="true"
                    className={styles.dialog}
                    ref={this.setDialog}
                    role="dialog"
                    onSubmit={this.handleSubmit}
                >
                    <div className={styles.header}>
                        <h2
                            className={styles.title}
                            id="pebble-account-title"
                        >
                            {TITLES[mode]}
                        </h2>
                        <button
                            aria-label="Close"
                            className={styles.close}
                            type="button"
                            onClick={this.handleClose}
                        >
                            {'×'}
                        </button>
                    </div>
                    <div className={styles.body}>
                        {notice ? (
                            <React.Fragment>
                                <p
                                    className={styles.notice}
                                    role="status"
                                >
                                    {notice}
                                </p>
                                <button
                                    className={styles.submit}
                                    type="button"
                                    onClick={this.handleClose}
                                >
                                    {'OK'}
                                </button>
                            </React.Fragment>
                        ) : (
                            <React.Fragment>
                                {this.renderFields()}
                                {NEEDS_ROBOT_CHECK.includes(mode) && (
                                    <div
                                        className={styles.robotCheck}
                                        ref={this.setRobotCheck}
                                    />
                                )}
                                {error && (
                                    <p
                                        className={styles.error}
                                        role="alert"
                                    >
                                        {error}
                                    </p>
                                )}
                                {mode === 'verify' ? (
                                    <button
                                        className={styles.submit}
                                        disabled={busy}
                                        type="button"
                                        onClick={this.handleClose}
                                    >
                                        {'OK'}
                                    </button>
                                ) : (
                                    <button
                                        className={styles.submit}
                                        disabled={busy}
                                        type="submit"
                                    >
                                        {busy ? 'Please wait…' : BUTTONS[mode]}
                                    </button>
                                )}
                                {this.renderLinks()}
                            </React.Fragment>
                        )}
                    </div>
                </form>
            </div>
        ), document.body);
    }
}

AccountModal.propTypes = {
    mode: PropTypes.oneOf(Object.keys(TITLES)).isRequired,
    // The secret from a "reset your password" or "verify your email" link
    token: PropTypes.string,
    onClose: PropTypes.func.isRequired
};

export default AccountModal;
