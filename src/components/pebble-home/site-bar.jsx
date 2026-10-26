import React from 'react';

import {APP_NAME} from '../../lib/brand';
import {getGitHubRepoURL, hasGitHub} from '../../lib/pebble-github';
import pebbleLogo from '../menu-bar/pebble-logo.svg';
import AccountButton from '../pebble-account/account-button.jsx';
import {PROJECTS_ENABLED} from '../../lib/pebble-projects';

import styles from './home.css';

const EDITOR_URL = 'editor.html';
const PACKAGER_URL = 'packager/';

/**
 * The bar along the top of the home page and the profile page.
 * @returns {React.ReactElement} The bar.
 */
const SiteBar = () => (
    <header className={styles.bar}>
        <nav className={styles.barBox}>
            <a
                className={styles.brand}
                href="./"
            >
                <img
                    alt=""
                    className={styles.brandLogo}
                    src={pebbleLogo}
                />
                <span className={styles.brandName}>{APP_NAME}</span>
            </a>
            <a
                className={styles.barLink}
                href={EDITOR_URL}
            >
                {'Create'}
            </a>
            <a
                className={styles.barLink}
                href={PACKAGER_URL}
            >
                {'Packager'}
            </a>
            {hasGitHub() && (
                <a
                    className={styles.barLink}
                    href={getGitHubRepoURL()}
                    rel="noreferrer"
                    target="_blank"
                >
                    {'GitHub'}
                </a>
            )}
        </nav>
        {PROJECTS_ENABLED && (
            <form
                action="./"
                className={styles.barSearch}
                role="search"
            >
                <input
                    aria-label="Search projects"
                    className={styles.barSearchInput}
                    defaultValue={new URLSearchParams(location.search).get('q') || ''}
                    name="q"
                    placeholder="Search projects"
                    type="search"
                />
            </form>
        )}
        <div className={styles.barBox}>
            <AccountButton
                handleEmailLinks
                className={styles.barAccount}
                iconClassName={styles.barIcon}
            />
            <a
                className={styles.barButton}
                href={EDITOR_URL}
            >
                {'Start creating'}
            </a>
        </div>
    </header>
);

export {
    EDITOR_URL,
    PACKAGER_URL
};
export default SiteBar;
