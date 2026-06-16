-- OpenHub schema for PostgreSQL (replaces original SQLite/D1 schema)
-- Run with: psql "$DATABASE_URL" -f scripts/schema.sql

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS industries (
  id         TEXT PRIMARY KEY,
  name_zh    TEXT NOT NULL,
  name_en    TEXT NOT NULL,
  icon       TEXT,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS scenes (
  id          TEXT PRIMARY KEY,
  industry_id TEXT NOT NULL REFERENCES industries(id) ON DELETE CASCADE,
  name_zh     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS projects (
  id                TEXT PRIMARY KEY,
  github_full_name  TEXT UNIQUE NOT NULL,
  display_name      TEXT NOT NULL,
  description_zh    TEXT,
  industry_id       TEXT REFERENCES industries(id) ON DELETE SET NULL,
  scene_id          TEXT REFERENCES scenes(id) ON DELETE SET NULL,
  tags              JSONB DEFAULT '[]'::jsonb,
  stars             INTEGER DEFAULT 0,
  language          TEXT,
  license           TEXT,
  updated_at        TEXT,
  deploy_level      TEXT CHECK (deploy_level IS NULL OR deploy_level IN ('L1','L2','L3','L4')),
  deploy_difficulty INTEGER,
  chinese_support   TEXT CHECK (chinese_support IS NULL OR chinese_support IN ('full','partial','none')),
  screenshots       JSONB DEFAULT '[]'::jsonb,
  alternative_to    JSONB DEFAULT '[]'::jsonb,
  target_users      JSONB DEFAULT '[]'::jsonb,
  use_cases         JSONB DEFAULT '[]'::jsonb,
  features          JSONB DEFAULT '[]'::jsonb,
  github_url        TEXT NOT NULL,
  homepage          TEXT,
  deploy_command    TEXT,
  quality_score     INTEGER DEFAULT 0,
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','published','rejected')),
  created_at        TEXT NOT NULL,
  published_at      TEXT
);

-- Generated tsvector column for full-text search (Chinese-friendly via 'simple').
-- tags is JSONB so we cast to text; description_zh and display_name are already text.
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS search_tsv tsvector
  GENERATED ALWAYS AS (
    to_tsvector(
      'simple',
      coalesce(display_name, '') || ' ' ||
      coalesce(description_zh, '') || ' ' ||
      coalesce(tags::text, '')
    )
  ) STORED;

CREATE INDEX IF NOT EXISTS projects_search_idx ON projects USING GIN (search_tsv);
CREATE INDEX IF NOT EXISTS projects_name_trgm ON projects USING GIN (display_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS projects_industry_idx ON projects (industry_id);
CREATE INDEX IF NOT EXISTS projects_scene_idx ON projects (scene_id);
CREATE INDEX IF NOT EXISTS projects_status_stars_idx ON projects (status, stars DESC);

CREATE TABLE IF NOT EXISTS pending_queue (
  github_full_name TEXT PRIMARY KEY,
  raw_data         JSONB NOT NULL,
  auto_score       INTEGER DEFAULT 0,
  collected_at     TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected'))
);

CREATE INDEX IF NOT EXISTS pending_status_score_idx ON pending_queue (status, auto_score DESC);
