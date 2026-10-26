-- Shared projects, with upvotes, saves and views. The project files and thumbnails are kept in
-- R2 (or KV); see server/projects.js.

CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL,
    -- When the owner last changed it. Owners can change a project once every 10 minutes.
    changed_at INTEGER NOT NULL,
    file_version INTEGER NOT NULL,
    file_size INTEGER NOT NULL,
    -- Empty when there's no thumbnail
    thumbnail_version INTEGER,
    views INTEGER NOT NULL DEFAULT 0,
    upvotes INTEGER NOT NULL DEFAULT 0,
    -- When it first reached enough upvotes to be featured
    featured_at INTEGER
);
CREATE INDEX IF NOT EXISTS projects_by_owner ON projects (owner_id, created_at);
CREATE INDEX IF NOT EXISTS projects_by_upvotes ON projects (upvotes);
CREATE INDEX IF NOT EXISTS projects_by_featured ON projects (featured_at);

CREATE TABLE IF NOT EXISTS project_upvotes (
    user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    project_id INTEGER NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, project_id)
);
CREATE INDEX IF NOT EXISTS project_upvotes_by_project ON project_upvotes (project_id);

CREATE TABLE IF NOT EXISTS project_saves (
    user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    project_id INTEGER NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, project_id)
);
CREATE INDEX IF NOT EXISTS project_saves_by_project ON project_saves (project_id);

-- Each person counts as one view per project (people who aren't signed in, once a day)
CREATE TABLE IF NOT EXISTS project_views (
    project_id INTEGER NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
    viewer TEXT NOT NULL,
    PRIMARY KEY (project_id, viewer)
);
