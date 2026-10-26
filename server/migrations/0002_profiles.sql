-- Profiles: bio, profile picture and role, plus email verification.

ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0;
-- member, developer, moderator or admin. Only changed by hand (see server/SETUP.md).
ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'member';
ALTER TABLE users ADD COLUMN bio TEXT NOT NULL DEFAULT '';
-- When the profile picture last changed, so browsers know to load the new one. Empty when there's none.
ALTER TABLE users ADD COLUMN avatar_version INTEGER;

CREATE TABLE IF NOT EXISTS avatars (
    user_id INTEGER PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    image BLOB NOT NULL,
    type TEXT NOT NULL
);

-- Links from "verify your email" emails
CREATE TABLE IF NOT EXISTS email_verifications (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL,
    sent_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS email_verifications_by_user ON email_verifications (user_id);
