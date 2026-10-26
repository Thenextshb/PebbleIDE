-- Who follows who

CREATE TABLE IF NOT EXISTS follows (
    follower_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    followed_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (follower_id, followed_id)
);
CREATE INDEX IF NOT EXISTS follows_by_followed ON follows (followed_id);
