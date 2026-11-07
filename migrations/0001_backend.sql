CREATE TABLE IF NOT EXISTS user (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
  emailVerified INTEGER NOT NULL DEFAULT 0, image TEXT,
  createdAt DATE NOT NULL, updatedAt DATE NOT NULL
);
CREATE TABLE IF NOT EXISTS session (
  id TEXT PRIMARY KEY, expiresAt DATE NOT NULL, token TEXT NOT NULL UNIQUE,
  createdAt DATE NOT NULL, updatedAt DATE NOT NULL, ipAddress TEXT, userAgent TEXT,
  userId TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS session_user ON session(userId);
CREATE TABLE IF NOT EXISTS account (
  id TEXT PRIMARY KEY, accountId TEXT NOT NULL, providerId TEXT NOT NULL,
  userId TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  accessToken TEXT, refreshToken TEXT, idToken TEXT, accessTokenExpiresAt DATE,
  refreshTokenExpiresAt DATE, scope TEXT, password TEXT,
  createdAt DATE NOT NULL, updatedAt DATE NOT NULL
);
CREATE INDEX IF NOT EXISTS account_user ON account(userId);
CREATE UNIQUE INDEX IF NOT EXISTS account_provider ON account(providerId, accountId);
CREATE TABLE IF NOT EXISTS verification (
  id TEXT PRIMARY KEY, identifier TEXT NOT NULL, value TEXT NOT NULL,
  expiresAt DATE NOT NULL, createdAt DATE NOT NULL, updatedAt DATE NOT NULL
);
CREATE INDEX IF NOT EXISTS verification_identifier ON verification(identifier);
CREATE TABLE IF NOT EXISTS rateLimit (
  id TEXT PRIMARY KEY, key TEXT NOT NULL UNIQUE, count INTEGER NOT NULL, lastRequest INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS member (
  user_id TEXT PRIMARY KEY REFERENCES user(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('developer', 'company', 'recruiter'))
);
CREATE TABLE IF NOT EXISTS developer (
  user_id TEXT PRIMARY KEY REFERENCES member(user_id) ON DELETE CASCADE,
  profile TEXT NOT NULL CHECK (json_valid(profile)),
  embedding TEXT NOT NULL CHECK (json_valid(embedding)),
  embedding_model TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS opportunity (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES member(user_id) ON DELETE CASCADE,
  details TEXT NOT NULL CHECK (json_valid(details)),
  analysis TEXT NOT NULL CHECK (json_valid(analysis)),
  embedding TEXT NOT NULL CHECK (json_valid(embedding)),
  analysis_model TEXT NOT NULL, analysis_version TEXT NOT NULL, embedding_model TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS opportunity_owner ON opportunity(owner_id, created_at);
CREATE INDEX IF NOT EXISTS opportunity_status ON opportunity(status, created_at);
CREATE TABLE IF NOT EXISTS interest (
  opportunity_id TEXT NOT NULL REFERENCES opportunity(id) ON DELETE CASCADE,
  developer_id TEXT NOT NULL REFERENCES developer(user_id) ON DELETE CASCADE,
  company_interested INTEGER NOT NULL DEFAULT 0 CHECK (company_interested IN (0, 1)),
  developer_interested INTEGER NOT NULL DEFAULT 0 CHECK (developer_interested IN (0, 1)),
  first_company_interest_at INTEGER,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (opportunity_id, developer_id)
);
CREATE INDEX IF NOT EXISTS interest_developer ON interest(developer_id, first_company_interest_at);
