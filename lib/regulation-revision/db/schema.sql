-- 規程改正ワークスペース（案A: 3表）
-- workspaces 1 → N regulations 1 → N articles

CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  summary TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS regulations (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  progress_status TEXT NOT NULL DEFAULT 'notStarted',
  source_text TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS regulations_workspace_id_idx ON regulations (workspace_id);

CREATE TABLE IF NOT EXISTS articles (
  id TEXT PRIMARY KEY,
  regulation_id TEXT NOT NULL REFERENCES regulations (id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL,
  kind TEXT NOT NULL,
  label TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  old_text TEXT,
  new_text TEXT,
  revision_reason TEXT NOT NULL DEFAULT '',
  is_revision_target BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS articles_regulation_id_idx ON articles (regulation_id);
