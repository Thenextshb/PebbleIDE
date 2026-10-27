import React from 'react';

import {APP_NAME} from '../../lib/brand';
import {getGitHubRepoURL, hasGitHub} from '../../lib/pebble-github';
import pebbleLogo from '../menu-bar/pebble-logo.svg';
import {PROJECTS_ENABLED} from '../../lib/pebble-projects';
import {SearchIcon} from '../pebble-projects/icons.jsx';
import SiteAccount from './site-account.jsx';

import styles from './home.css';

const EDITOR_URL = 'editor.html';
const PACKAGER_URL = 'packager/';

/**
 * The bar along the top of the home, profile and project pages, like Scratch's.
 * @returns {React.ReactElement} The bar.
 */
const SiteBar = () => (
    <header className={styles.nav}>
        <nav className={styles.navInner}>
            <a
                className={`${styles.navItem} ${styles.navLogo}`}
                href="./"
            >
                <img
                    alt=""
                    className={styles.navLogoImage}
                    src={pebbleLogo}
                />
                <span className={styles.navLogoName}>{APP_NAME}</span>
            </a>
            <a
                className={styles.navItem}
                href={EDITOR_URL}
            >
                {'Create'}
            </a>
            <a
                className={`${styles.navItem} ${styles.navHideSmall}`}
                href={PACKAGER_URL}
            >
                {'Packager'}
            </a>
            {hasGitHub() && (
                <a
                    className={`${styles.navItem} ${styles.navHideMedium}`}
                    href={getGitHubRepoURL()}
                    rel="noreferrer"
                    target="_blank"
                >
                    {'GitHub'}
                </a>
            )}
            {PROJECTS_ENABLED ? (
                <form
                    action="./"
                    className={styles.navSearch}
                    role="search"
                >
                    <SearchIcon className={styles.navSearchIcon} />
                    <input
                        aria-label="Search projects"
                        className={styles.navSearchInput}
                        defaultValue={new URLSearchParams(location.search).get('q') || ''}
                        name="q"
                        placeholder="Search"
                        type="search"
                    />
                </form>
            ) : <div className={styles.navSearch} />}
            <SiteAccount />
        </nav>
    </header>
);

export {
    EDITOR_URL,
    PACKAGER_URL
};
export default SiteBar;
