/**
 * PebbleIDE's Cloudflare Worker. The site's files (the build folder) are served by Cloudflare directly;
 * this only runs for addresses under /api/ (see run_worker_first in wrangler.toml).
 */

import {handleAccountRequest} from './accounts.js';
import {handleProjectRequest} from './projects.js';
import {handleReportRequest} from './reports.js';

export default {
    fetch (request, env) {
        const path = new URL(request.url).pathname;
        // /api/accounts/<action>
        const account = path.match(/^\/api\/accounts\/([^/]+)$/);
        if (account) {
            return handleAccountRequest(request, env, account[1]);
        }
        // /api/projects, /api/projects/<id> and /api/projects/<id>/<action>
        if (path === '/api/projects' || path.startsWith('/api/projects/')) {
            const parts = path.slice('/api/projects'.length).split('/')
                .filter(Boolean);
            return handleProjectRequest(request, env, parts);
        }
        // /api/reports and /api/reports/<id>/resolve
        if (path === '/api/reports' || path.startsWith('/api/reports/')) {
            const parts = path.slice('/api/reports'.length).split('/')
                .filter(Boolean);
            return handleReportRequest(request, env, parts);
        }
        if (path.startsWith('/api/')) {
            return new Response(JSON.stringify({error: 'not-found', message: 'Not found.'}), {
                status: 404,
                headers: {'Content-Type': 'application/json'}
            });
        }
        return env.ASSETS.fetch(request);
    }
};
