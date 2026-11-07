-- Expand roles so a general user can post local requests.
PRAGMA foreign_keys = OFF;
CREATE TABLE member_new (
  user_id TEXT PRIMARY KEY REFERENCES user(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('developer', 'company', 'recruiter', 'requester'))
);
INSERT INTO member_new (user_id, role) SELECT user_id, role FROM member;
DROP TABLE member;
ALTER TABLE member_new RENAME TO member;
PRAGMA foreign_keys = ON;

ALTER TABLE developer ADD COLUMN latitude REAL;
ALTER TABLE developer ADD COLUMN longitude REAL;
ALTER TABLE developer ADD COLUMN radius_km REAL;

CREATE TABLE IF NOT EXISTS request (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES member(user_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  place TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  analysis TEXT NOT NULL CHECK (json_valid(analysis)),
  embedding TEXT NOT NULL CHECK (json_valid(embedding)),
  analysis_model TEXT NOT NULL,
  analysis_version TEXT NOT NULL,
  embedding_model TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'claimed', 'closed')),
  claimed_by TEXT REFERENCES developer(user_id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL,
  CHECK (
    (status = 'claimed' AND claimed_by IS NOT NULL)
    OR (status != 'claimed' AND claimed_by IS NULL)
  )
);
CREATE INDEX IF NOT EXISTS request_owner ON request(owner_id, created_at);
CREATE INDEX IF NOT EXISTS request_open_lat ON request(status, latitude);
CREATE INDEX IF NOT EXISTS request_claimant ON request(claimed_by, created_at);
