import React from 'react';

import {APP_NAME} from '../../lib/brand';
import {getGitHubRepoURL, hasGitHub} from '../../lib/pebble-github';
import {EDITOR_URL, PACKAGER_URL} from './site-bar.jsx';

import styles from './home.css';

const CREDITS_URL = 'credits.html';

/**
 * The footer along the bottom of the home, profile and project pages, like Scratch's.
 * @returns {React.ReactElement} The footer.
 */
const SiteFooter = () => (
    <footer className={styles.footer}>
        <div className={styles.footerInner}>
            <div className={styles.footerColumns}>
                <div>
                    <h4 className={styles.footerHeading}>{APP_NAME}</h4>
                    <ul className={styles.footerLinks}>
                        <li><a href={EDITOR_URL}>{'Create'}</a></li>
                        <li><a href={PACKAGER_URL}>{'Packager'}</a></li>
                        <li><a href={CREDITS_URL}>{'Credits'}</a></li>
                    </ul>
                </div>
                {hasGitHub() && (
                    <div>
                        <h4 className={styles.footerHeading}>{'Open source'}</h4>
                        <ul className={styles.footerLinks}>
                            <li>
                                <a
                                    href={getGitHubRepoURL()}
                                    rel="noreferrer"
                                    target="_blank"
                                >
                                    {'GitHub'}
                                </a>
                            </li>
                            <li>
                                <a
                                    href={`${getGitHubRepoURL()}/issues/new`}
                                    rel="noreferrer"
                                    target="_blank"
                                >
                                    {'Report a problem'}
                                </a>
                            </li>
                        </ul>
                    </div>
                )}
            </div>
            <div className={styles.footerPrint}>
                <p>
                    {`${APP_NAME} is not affiliated with Scratch, the Scratch Team, ` +
                        'or the Scratch Foundation.'}
                </p>
                <p>
                    {'Scratch is a project of the Scratch Foundation. It is available for free at '}
                    <a
                        href="https://scratch.org/"
                        rel="noreferrer"
                        target="_blank"
                    >
                        {'https://scratch.org/'}
                    </a>
                    {'.'}
                </p>
            </div>
        </div>
    </footer>
);

export default SiteFooter;
