import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';

import {APP_NAME} from '../../lib/brand';
import {
    getGitHubApiURL,
    getGitHubRawURL,
    getGitHubRepoURL,
    hasGitHub
} from '../../lib/pebble-github';
import pebbleLogo from '../menu-bar/pebble-logo.svg';
import SiteBar, {EDITOR_URL, PACKAGER_URL} from './site-bar.jsx';
import SiteFooter from './site-footer.jsx';
import HomeProjects, {getSearchQuery} from '../pebble-projects/home-projects.jsx';

import projectStyles from '../pebble-projects/projects.css';
import styles from './home.css';

const CREDITS_URL = 'credits.html';
// At the top of the repository so it's easy to find and edit on GitHub
const NEWS_FILE = 'news.txt';

// Only web links, so a news post can't run code through its link
const safeURL = url => {
    if (typeof url !== 'string') return null;
    try {
        const parsed = new URL(url, location.href);
        return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.href : null;
    } catch (e) {
        return null;
    }
};

// Dates and times in the visitor's own language
const LOCALE = typeof navigator === 'undefined' ? 'en' : navigator.language;

const formatDate = date => {
    const parsed = new Date(`${date}T00:00:00`);
    if (isNaN(parsed.getTime())) return date;
    return parsed.toLocaleDateString(LOCALE, {year: 'numeric', month: 'long', day: 'numeric'});
};

const timeAgo = date => {
    const seconds = (new Date(date).getTime() - Date.now()) / 1000;
    if (isNaN(seconds)) return '';
    const units = [['year', 31536000], ['month', 2592000], ['day', 86400], ['hour', 3600], ['minute', 60]];
    const format = new Intl.RelativeTimeFormat(LOCALE, {numeric: 'auto'});
    for (const [unit, size] of units) {
        if (Math.abs(seconds) >= size) return format.format(Math.round(seconds / size), unit);
    }
    return format.format(0, 'minute');
};

const fetchJSON = url => fetch(url, {cache: 'no-cache'}).then(response => {
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
});

/**
 * Read news.txt. A post starts with "# Title"; "Date:", "Link: text | address" and "Image:" lines
 * are optional; everything else is the post's text. Lines starting with // are notes.
 * @param {string} text Contents of news.txt.
 * @returns {object[]} Posts, in the order they're written.
 */
const parseNews = text => {
    const posts = [];
    let post = null;
    for (const rawLine of text.split(/\r?\n/)) {
        const line = rawLine.replace(/\s+$/, '');
        if (line.trim().startsWith('//')) continue;
        const title = line.match(/^#\s+(.+)$/);
        if (title) {
            post = {title: title[1].trim(), date: '', image: '', link: null, lines: []};
            posts.push(post);
            continue;
        }
        // Anything before the first title isn't part of a post
        if (!post) continue;
        const field = line.match(/^(date|link|image):\s*(.*)$/i);
        if (field) {
            const name = field[1].toLowerCase();
            const value = field[2].trim();
            if (name === 'date') {
                post.date = value;
            } else if (name === 'image') {
                post.image = value;
            } else {
                const [linkText, url] = value.includes('|') ? value.split('|').map(part => part.trim()) : ['', value];
                post.link = {text: linkText, url};
            }
            continue;
        }
        post.lines.push(line);
    }
    return posts.map(({lines, ...rest}) => ({
        ...rest,
        body: lines.join('\n').trim()
    }));
};

// The newest news is on GitHub; the copy deployed with the site is the backup
const loadNews = async () => {
    const urls = hasGitHub() ? [getGitHubRawURL(NEWS_FILE), NEWS_FILE] : [NEWS_FILE];
    let lastError;
    for (const url of urls) {
        try {
            const response = await fetch(url, {cache: 'no-cache'});
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return parseNews(await response.text());
        } catch (e) {
            lastError = e;
        }
    }
    throw lastError || new Error('No news');
};

const loadGitHub = () => Promise.all([
    fetchJSON(getGitHubApiURL('')),
    fetchJSON(getGitHubApiURL('/commits?per_page=5'))
]).then(([repo, commits]) => ({repo, commits}));

const GitHubMark = () => (
    <svg
        aria-hidden="true"
        className={styles.githubMark}
        viewBox="0 0 16 16"
    >
        <path
            fill="currentColor"
            // eslint-disable-next-line max-len
            d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"
        />
    </svg>
);

const NewsPost = ({post}) => {
    const link = post.link && safeURL(post.link.url);
    // An empty address would point at this page
    const image = post.image && safeURL(post.image);
    const paragraphs = String(post.body || '').split(/\n\s*\n/)
        .filter(paragraph => paragraph.trim());
    return (
        <li className={styles.newsPost}>
            {image && (
                <img
                    alt=""
                    className={styles.newsImage}
                    src={image}
                />
            )}
            <div className={styles.newsText}>
                <h3 className={styles.newsTitle}>{link ? <a href={link}>{post.title}</a> : post.title}</h3>
                {post.date && (
                    <div className={styles.newsDate}>{formatDate(post.date)}</div>
                )}
                {paragraphs.map((paragraph, index) => (
                    <p
                        className={styles.newsBody}
                        key={index}
                    >
                        {paragraph}
                    </p>
                ))}
                {link && (
                    <a
                        className={styles.newsLink}
                        href={link}
                    >
                        {post.link.text || 'Learn more'}
                    </a>
                )}
            </div>
        </li>
    );
};

NewsPost.propTypes = {
    post: PropTypes.shape({
        body: PropTypes.string,
        date: PropTypes.string,
        image: PropTypes.string,
        link: PropTypes.shape({
            text: PropTypes.string,
            url: PropTypes.string
        }),
        title: PropTypes.string
    }).isRequired
};

/**
 * A box like the ones on Scratch's front page: a title bar, then what's in it.
 * @param {object} props Props.
 * @returns {React.ReactElement} The box.
 */
const Box = ({title, note, children}) => (
    <section className={projectStyles.box}>
        <div className={projectStyles.boxHeader}>
            <h2 className={projectStyles.boxTitle}>{title}</h2>
            {note}
        </div>
        <div className={projectStyles.boxContent}>{children}</div>
    </section>
);

Box.propTypes = {
    children: PropTypes.node,
    note: PropTypes.node,
    title: PropTypes.node
};

const GitHubCard = ({github, error}) => {
    const repoURL = getGitHubRepoURL();
    let content;
    if (error) {
        content = <p className={styles.cardText}>{'Couldn\'t load GitHub right now.'}</p>;
    } else if (github) {
        const {repo, commits} = github;
        content = (
            <React.Fragment>
                {repo.description && <p className={styles.cardText}>{repo.description}</p>}
                <div className={styles.stats}>
                    <div className={styles.stat}>
                        <span className={styles.statNumber}>{repo.stargazers_count}</span>
                        {'stars'}
                    </div>
                    <div className={styles.stat}>
                        <span className={styles.statNumber}>{repo.forks_count}</span>
                        {'forks'}
                    </div>
                    <div className={styles.stat}>
                        <span className={styles.statNumber}>{repo.open_issues_count}</span>
                        {'issues'}
                    </div>
                </div>
                <h3 className={styles.cardSubheading}>{'Latest changes'}</h3>
                <ul className={styles.commits}>
                    {commits.map(commit => (
                        <li
                            className={styles.commit}
                            key={commit.sha}
                        >
                            <a
                                className={styles.commitMessage}
                                href={commit.html_url}
                                rel="noreferrer"
                                target="_blank"
                            >
                                {commit.commit.message.split('\n')[0]}
                            </a>
                            <span className={styles.commitDate}>
                                {timeAgo(commit.commit.author && commit.commit.author.date)}
                            </span>
                        </li>
                    ))}
                </ul>
            </React.Fragment>
        );
    } else {
        content = <p className={styles.cardText}>{'Loading…'}</p>;
    }
    return (
        <Box
            title={(
                <React.Fragment>
                    <GitHubMark />
                    {'Open source'}
                </React.Fragment>
            )}
        >
            {content}
            <div className={styles.cardButtons}>
                <a
                    className={classNames(projectStyles.button, projectStyles.small, projectStyles.secondary)}
                    href={repoURL}
                    rel="noreferrer"
                    target="_blank"
                >
                    {'View on GitHub'}
                </a>
                <a
                    className={classNames(projectStyles.button, projectStyles.small, projectStyles.secondary)}
                    href={`${repoURL}/issues/new`}
                    rel="noreferrer"
                    target="_blank"
                >
                    {'Report a problem'}
                </a>
            </div>
        </Box>
    );
};

GitHubCard.propTypes = {
    error: PropTypes.bool,
    github: PropTypes.shape({
        commits: PropTypes.arrayOf(PropTypes.object),
        repo: PropTypes.object
    })
};

const AboutCard = () => (
    <Box title={`About ${APP_NAME}`}>
        <p className={styles.cardText}>
            {`${APP_NAME} is free to use and open source. It's built on TurboWarp and Scratch, ` +
                'with extra blocks and extensions from PenguinMod and Snail IDE.'}
        </p>
        <div className={styles.cardButtons}>
            <a
                className={classNames(projectStyles.button, projectStyles.small, projectStyles.secondary)}
                href={CREDITS_URL}
            >
                {'Credits'}
            </a>
        </div>
    </Box>
);

class Home extends React.Component {
    constructor (props) {
        super(props);
        this.state = {
            news: null,
            newsError: false,
            github: null,
            githubError: false
        };
    }
    componentDidMount () {
        loadNews()
            .then(news => this.setState({news}))
            .catch(() => this.setState({newsError: true}));
        if (hasGitHub()) {
            loadGitHub()
                .then(github => this.setState({github}))
                .catch(() => this.setState({githubError: true}));
        }
    }
    renderNews () {
        if (this.state.newsError) {
            return <p className={styles.newsMessage}>{'News couldn\'t be loaded right now.'}</p>;
        }
        if (!this.state.news) {
            return <p className={styles.newsMessage}>{'Loading news…'}</p>;
        }
        if (this.state.news.length === 0) {
            return <p className={styles.newsMessage}>{'No news yet. Check back soon!'}</p>;
        }
        return (
            <ul className={styles.newsList}>
                {this.state.news.map((post, index) => (
                    <NewsPost
                        key={`${post.date}-${index}`}
                        post={post}
                    />
                ))}
            </ul>
        );
    }
    render () {
        const searching = !!getSearchQuery();
        return (
            <div className={styles.page}>
                <SiteBar />

                {!searching && <section className={styles.hero}>
                    <div
                        aria-hidden="true"
                        className={styles.heroRings}
                    />
                    <img
                        alt={APP_NAME}
                        className={styles.heroLogo}
                        src={pebbleLogo}
                    />
                    <h1 className={styles.heroTitle}>{APP_NAME}</h1>
                    <p className={styles.heroTagline}>{'Make games, animations and apps with blocks.'}</p>
                    <div className={styles.heroButtons}>
                        <a
                            className={classNames(projectStyles.button, projectStyles.big)}
                            href={EDITOR_URL}
                        >
                            {'Start creating'}
                        </a>
                        <a
                            className={classNames(projectStyles.button, projectStyles.big, projectStyles.secondary)}
                            href={PACKAGER_URL}
                        >
                            {'Package a project'}
                        </a>
                    </div>
                </section>}

                <main className={styles.splash}>
                    <HomeProjects />

                    {!searching && <div className={styles.splashRow}>
                        <Box title={`${APP_NAME} News`}>
                            {this.renderNews()}
                        </Box>
                        <div className={styles.side}>
                            {hasGitHub() ? (
                                <GitHubCard
                                    error={this.state.githubError}
                                    github={this.state.github}
                                />
                            ) : (
                                <AboutCard />
                            )}
                            <Box title="Get started">
                                <ul className={styles.quickLinks}>
                                    <li>
                                        <a href={EDITOR_URL}>{'Make a new project'}</a>
                                    </li>
                                    <li>
                                        <a href={PACKAGER_URL}>{'Turn a project into an app'}</a>
                                    </li>
                                    <li>
                                        <a href={CREDITS_URL}>{'See who made this possible'}</a>
                                    </li>
                                </ul>
                            </Box>
                        </div>
                    </div>}
                </main>

                <SiteFooter />
            </div>
        );
    }
}

export default Home;
