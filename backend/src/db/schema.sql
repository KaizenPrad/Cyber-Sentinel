-- This file is the database schema. It creates all Postgres tables for:
-- Organizations, users, memberships, and sessions (auth)
-- Devices, signals, and network_events (ingestion)
-- Detections, detection_signals, incidents, remediation_logs (analysis)
-- API keys (programmatic access)
-- Run it with: npm run migrate

-- Enable pgcrypto so we can use gen_random_uuid() for IDs.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Organizations table: one row per customer workspace (e.g. Demo SOC).
CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT, -- unique org id, auto-generated
  name TEXT NOT NULL, -- display name like Demo SOC
  slug TEXT UNIQUE NOT NULL, -- URL-friendly unique name like demo-soc-abc123
  created_at TIMESTAMPTZ DEFAULT NOW() -- when the org was created
);

-- Users table: one row per login account, linked to its home org.
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT, -- unique user id, auto-generated
  email TEXT UNIQUE NOT NULL, -- login email, must be unique
  password_hash TEXT NOT NULL, -- bcrypt hash, never the plain password
  first_name TEXT NOT NULL, -- user's first name
  last_name TEXT NOT NULL, -- user's last name
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, -- home org, deleted if org is deleted
  last_login_at TIMESTAMPTZ, -- last successful login time
  created_at TIMESTAMPTZ DEFAULT NOW() -- when the user was created
);

-- Organization_members table: links users to orgs with a role (OWNER/ADMIN/MEMBER).
CREATE TABLE IF NOT EXISTS organization_members (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT, -- unique membership id
  role TEXT NOT NULL DEFAULT 'MEMBER', -- OWNER, ADMIN, or MEMBER
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- which user
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, -- which org
  created_at TIMESTAMPTZ DEFAULT NOW(), -- when they joined
  UNIQUE(user_id, organization_id) -- one membership per user per org
);

-- Sessions table: one row per login refresh token so we can revoke sessions.
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT, -- unique session id
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- who owns this session
  refresh_token TEXT NOT NULL UNIQUE, -- long random token, unique per session
  ip_address TEXT, -- IP the user logged in from
  user_agent TEXT, -- browser/device string
  expires_at TIMESTAMPTZ NOT NULL, -- when the refresh token expires
  created_at TIMESTAMPTZ DEFAULT NOW() -- when the session started
);

-- Devices table: monitored computers/servers per org (e.g. WS-101).
CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT, -- unique device id
  hostname TEXT NOT NULL, -- computer name like WS-101
  os TEXT, -- operating system like Windows 11
  ip_address TEXT, -- last known IP
  criticality INT DEFAULT 50, -- 0-100 importance, boosts risk scores
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, -- which org owns it
  last_seen_at TIMESTAMPTZ -- last time we saw a signal from it
);

-- Signals table: raw normalized security events sent to /ingest.
CREATE TABLE IF NOT EXISTS signals (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT, -- unique signal id
  signal_type TEXT NOT NULL, -- e.g. PHISH_CLICK, MASS_FILE_RENAME
  category TEXT NOT NULL, -- NETWORK, AUTH, ENDPOINT, EMAIL, or WEB
  severity TEXT NOT NULL DEFAULT 'INFO', -- INFO, LOW, MEDIUM, HIGH, or CRITICAL
  message TEXT NOT NULL, -- human-readable description
  source_ip TEXT, -- attacker or source IP if known
  user_identity TEXT, -- affected user if known
  hostname TEXT, -- affected host if known
  domain TEXT, -- suspicious domain if known
  raw_data JSONB DEFAULT '{}', -- extra vendor payload as JSON
  risk_score INT, -- 0-100 score from aiScoring service
  risk_factors TEXT[] DEFAULT ARRAY[]::TEXT[], -- reasons like base:PHISH_CLICK=40
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, -- which org it belongs to
  device_id TEXT REFERENCES devices(id) ON DELETE SET NULL, -- linked device, kept null if device deleted
  event_timestamp TIMESTAMPTZ NOT NULL, -- when the event happened
  ingested_at TIMESTAMPTZ DEFAULT NOW() -- when we saved it
);
CREATE INDEX IF NOT EXISTS idx_signals_org_time ON signals(organization_id, event_timestamp); -- speeds up per-org time queries
CREATE INDEX IF NOT EXISTS idx_signals_type ON signals(signal_type); -- speeds up filtering by type

-- Network_events table: raw network flow logs (src/dst IP, ports, bytes).
CREATE TABLE IF NOT EXISTS network_events (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT, -- unique event id
  src_ip TEXT NOT NULL, -- where the traffic came from
  dst_ip TEXT NOT NULL, -- where the traffic went to
  src_port INT, -- source port if known
  dst_port INT, -- destination port if known
  bytes BIGINT, -- how many bytes were transferred
  domain TEXT, -- domain contacted if known
  country TEXT, -- destination country if known
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, -- which org it belongs to
  event_timestamp TIMESTAMPTZ NOT NULL -- when the traffic happened
);

-- Detections table: correlated attack patterns found by the correlation service.
CREATE TABLE IF NOT EXISTS detections (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT, -- unique detection id
  title TEXT NOT NULL, -- e.g. Probable Ransomware Activity
  detection_type TEXT NOT NULL, -- RANSOMWARE, PHISHING, MALWARE, or UNAUTH_ACCESS
  risk_score INT NOT NULL, -- 0-100 correlation score
  confidence INT, -- 0-95 confidence based on match count
  severity TEXT NOT NULL, -- CRITICAL, HIGH, MEDIUM, or LOW
  explanation JSONB NOT NULL, -- matched signals, weights, and reasoning
  status TEXT DEFAULT 'OPEN', -- workflow status starting at OPEN
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, -- which org it belongs to
  created_at TIMESTAMPTZ DEFAULT NOW() -- when the detection was created
);

-- Detection_signals table: links detections to their evidence signals with weights.
CREATE TABLE IF NOT EXISTS detection_signals (
  detection_id TEXT REFERENCES detections(id) ON DELETE CASCADE, -- which detection
  signal_id TEXT REFERENCES signals(id) ON DELETE CASCADE, -- which evidence signal
  weight FLOAT NOT NULL, -- how much this signal counted (0-1)
  PRIMARY KEY (detection_id, signal_id) -- one link per detection per signal
);

-- Incidents table: actionable cases auto-created from HIGH/CRITICAL detections.
CREATE TABLE IF NOT EXISTS incidents (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT, -- unique incident id
  title TEXT NOT NULL, -- copied from the detection title
  description TEXT, -- reasoning sentence from the detection
  status TEXT DEFAULT 'OPEN', -- OPEN, INVESTIGATING, CONTAINED, RESOLVED, etc.
  severity TEXT NOT NULL, -- CRITICAL, HIGH, MEDIUM, or LOW
  assignee_id TEXT REFERENCES users(id) ON DELETE SET NULL, -- assigned analyst, null if unassigned
  detection_id TEXT REFERENCES detections(id) ON DELETE SET NULL, -- source detection, kept if deleted
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, -- which org it belongs to
  created_at TIMESTAMPTZ DEFAULT NOW(), -- when the incident was opened
  resolved_at TIMESTAMPTZ -- when it was resolved, null until then
);
CREATE INDEX IF NOT EXISTS idx_incidents_org_status ON incidents(organization_id, status); -- speeds up per-org status lists

-- Remediation_logs table: notes of actions taken on an incident.
CREATE TABLE IF NOT EXISTS remediation_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT, -- unique log id
  incident_id TEXT NOT NULL REFERENCES incidents(id) ON DELETE CASCADE, -- which incident
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- which analyst did it, removed with their account
  action TEXT NOT NULL, -- what was done, e.g. Isolated host
  notes TEXT, -- extra details
  created_at TIMESTAMPTZ DEFAULT NOW() -- when the action was logged
);

-- Api_keys table: hashed API keys for programmatic access per org.
CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT, -- unique key id
  name TEXT NOT NULL, -- friendly name like CI pipeline
  key_hash TEXT NOT NULL UNIQUE, -- SHA256 of the real key, never the key itself
  key_prefix TEXT NOT NULL, -- first 12 chars like cs_live_xxx for fast lookup
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, -- which org owns it
  created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- who created it, removed with their account
  last_used_at TIMESTAMPTZ, -- last time the key was used
  expires_at TIMESTAMPTZ, -- expiry time, null means never expires
  revoked_at TIMESTAMPTZ, -- revoke time, null means still active
  created_at TIMESTAMPTZ DEFAULT NOW() -- when the key was created
);
CREATE INDEX IF NOT EXISTS idx_api_keys_org ON api_keys(organization_id); -- speeds up per-org key lists
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix); -- speeds up key lookups by prefix
