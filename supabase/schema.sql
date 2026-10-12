-- Nexu AI — database schema
-- Run this once, in full, in your Supabase project's SQL Editor (Dashboard →
-- SQL Editor → New query → paste → Run). Safe to re-run — every statement is
-- idempotent (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).
--
-- client_id on every table = the signed-in user's own auth.users id (Supabase
-- Auth), NOT a separate "clients" business table — so a user only ever sees
-- their own jobs/candidates/placements. Extracted from the shared NodalNexus
-- app's consolidated schema (supabase/00-GO-LIVE-SETUP.sql, "PART 6").

CREATE TABLE IF NOT EXISTS jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  company TEXT,
  skills_required JSONB DEFAULT '[]',
  experience_min INTEGER DEFAULT 0,
  experience_max INTEGER,
  salary_range TEXT,
  location TEXT,
  remote_ok BOOLEAN DEFAULT FALSE,
  description TEXT,
  must_haves JSONB DEFAULT '[]',
  nice_to_haves JSONB DEFAULT '[]',
  hiring_manager_name TEXT,
  hiring_manager_email TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open','filled','closed','on_hold')),
  positions_total INTEGER DEFAULT 1,
  positions_filled INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  filled_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS candidates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES auth.users(id),
  job_id UUID REFERENCES jobs(id),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  "current_role" TEXT,
  current_company TEXT,
  years_experience INTEGER,
  skills JSONB DEFAULT '[]',
  education TEXT,
  certifications JSONB DEFAULT '[]',
  cv_text TEXT,
  cv_url TEXT,
  career_summary TEXT,
  score INTEGER DEFAULT 0,
  grade TEXT DEFAULT 'D' CHECK (grade IN ('A','B','C','D')),
  score_reasoning TEXT,
  enrichment_data JSONB DEFAULT '{}',
  status TEXT DEFAULT 'new' CHECK (status IN (
    'new','shortlisted','interviewing','offered','placed','rejected','withdrawn'
  )),
  source TEXT DEFAULT 'email',
  rejection_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS placements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES auth.users(id),
  candidate_id UUID REFERENCES candidates(id),
  job_id UUID REFERENCES jobs(id),
  placement_date DATE DEFAULT CURRENT_DATE,
  fee_amount DECIMAL(10,2),
  start_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Added after the initial table creation (migrations 009 + 010 in the
-- original app) — kept here as plain ADD COLUMN IF NOT EXISTS so this one
-- file is the complete, current schema, not a changelog to replay.
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS confidence TEXT
    CHECK (confidence IN ('high', 'medium', 'low') OR confidence IS NULL);
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE placements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "jobs_client_policy" ON jobs;
DROP POLICY IF EXISTS "candidates_client_policy" ON candidates;
DROP POLICY IF EXISTS "placements_client_policy" ON placements;

CREATE POLICY "jobs_client_policy" ON jobs FOR ALL USING (auth.uid() = client_id);
CREATE POLICY "candidates_client_policy" ON candidates FOR ALL USING (auth.uid() = client_id);
CREATE POLICY "placements_client_policy" ON placements FOR ALL USING (auth.uid() = client_id);

-- The public /apply/[jobId] page needs to read an OPEN job's basic info
-- without being logged in (applicants aren't Supabase users). The actual
-- insert into `candidates` from that flow goes through the service_role key
-- (lib/supabase.ts's getSupabaseAdmin()), which bypasses RLS entirely — this
-- policy only covers the public, anonymous SELECT on jobs.
DROP POLICY IF EXISTS "jobs_public_read_open" ON jobs;
CREATE POLICY "jobs_public_read_open" ON jobs FOR SELECT
    USING (status = 'open');

CREATE INDEX IF NOT EXISTS idx_candidates_client_id ON candidates(client_id);
CREATE INDEX IF NOT EXISTS idx_candidates_job_id ON candidates(job_id);
CREATE INDEX IF NOT EXISTS idx_candidates_score ON candidates(score DESC);
CREATE INDEX IF NOT EXISTS idx_candidates_grade ON candidates(grade);
CREATE INDEX IF NOT EXISTS idx_candidates_status ON candidates(status);
CREATE INDEX IF NOT EXISTS idx_candidates_archived_at ON candidates(archived_at);
CREATE INDEX IF NOT EXISTS idx_jobs_client_id ON jobs(client_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_placements_client_id ON placements(client_id);
