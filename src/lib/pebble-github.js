// Where PebbleIDE lives on GitHub: https://github.com/Thenextshb/PebbleIDE
// The home page news (news.txt), the home page GitHub section and the sprite library are read from here,
// so editing them on GitHub updates the site without a rebuild. If GitHub can't be reached, the site
// uses the copies that were deployed with it.
export const GITHUB_USER = 'Thenextshb';
export const GITHUB_REPO = 'PebbleIDE';
export const GITHUB_BRANCH = 'main';

export const hasGitHub = () => !!GITHUB_USER;

/**
 * @param {string} path File in the repository, like "news.txt".
 * @returns {string} Its raw URL on GitHub, which updates as soon as you push.
 */
export const getGitHubRawURL = path =>
    `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${path}`;

export const getGitHubRepoURL = () => `https://github.com/${GITHUB_USER}/${GITHUB_REPO}`;

export const getGitHubApiURL = path => `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}${path}`;
