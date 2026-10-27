// Reports about projects and users (server/reports.js)

import {apiRequest, getSiteURL} from './pebble-accounts';

// The reasons people can pick, and how they're shown
const REPORT_REASONS = [
    {id: 'mean', name: 'Mean or inappropriate'},
    {id: 'scary', name: 'Scary or violent'},
    {id: 'personal-info', name: 'Shares personal information'},
    {id: 'copied', name: 'Copied someone else\'s work'},
    {id: 'spam', name: 'Spam'},
    {id: 'other', name: 'Something else'}
];

// Roles that can see reports
const STAFF_ROLES = ['developer', 'moderator', 'admin'];

const isStaff = user => !!user && STAFF_ROLES.includes(user.role);

const getAPIURL = path => getSiteURL(`api/reports${path}`);

/**
 * @param {object} report What's reported ("project" with its number, or "user" with their username), why,
 * and anything else they want to say.
 * @returns {Promise<object>} Whether it was sent.
 */
const sendReport = ({kind, target, reason, details}) => apiRequest(getAPIURL(''), {kind, target, reason, details});

/**
 * @param {boolean} handled True for reports already dealt with.
 * @returns {Promise<object[]>} Reports, newest first.
 */
const listReports = handled => apiRequest(getAPIURL(handled ? '?status=handled' : ''))
    .then(data => data.reports);

const resolveReport = id => apiRequest(getAPIURL(`/${id}/resolve`), {});

export {
    REPORT_REASONS,
    isStaff,
    listReports,
    resolveReport,
    sendReport
};
