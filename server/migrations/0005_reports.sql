-- Reports about projects and users, for the PebbleIDE team (developers, moderators and admins) to look at

CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reporter_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    -- "project" or "user"
    kind TEXT NOT NULL,
    project_id INTEGER REFERENCES projects (id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users (id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    details TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL,
    -- Set when someone on the team has dealt with it
    resolved_at INTEGER,
    resolved_by INTEGER REFERENCES users (id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS reports_by_status ON reports (resolved_at, created_at);
CREATE INDEX IF NOT EXISTS reports_by_reporter ON reports (reporter_id, created_at);
