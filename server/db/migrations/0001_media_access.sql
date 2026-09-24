-- Media access slice (PlatformApp / Connection / AdAccount / Sync)
-- Apply with: psql $DATABASE_URL -f server/db/migrations/0001_media_access.sql

CREATE TABLE IF NOT EXISTS media_platforms (
  id text PRIMARY KEY,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  logo_url text,
  status text NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS platform_asset_types (
  id text PRIMARY KEY,
  media_id text NOT NULL REFERENCES media_platforms(id),
  code text NOT NULL,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS platform_asset_types_media_code
  ON platform_asset_types (media_id, code);

CREATE TABLE IF NOT EXISTS platform_apps (
  id text PRIMARY KEY,
  media_id text NOT NULL REFERENCES media_platforms(id),
  app_id text NOT NULL,
  secret_encrypted text,
  developer_token_encrypted text,
  status text NOT NULL DEFAULT 'ACTIVE',
  is_default boolean NOT NULL DEFAULT true,
  redirect_uri_hint text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS media_connections (
  id text PRIMARY KEY,
  organization_id text NOT NULL,
  team_id text NOT NULL,
  media_id text NOT NULL REFERENCES media_platforms(id),
  platform_app_id text REFERENCES platform_apps(id),
  display_name text NOT NULL,
  authorized_by_user_id text NOT NULL,
  status text NOT NULL DEFAULT 'PENDING_AUTH',
  provider_identity_id text,
  provider_identity_name text,
  scopes jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_mock boolean NOT NULL DEFAULT false,
  authorized_at timestamptz,
  expires_at timestamptz,
  last_verified_at timestamptz,
  last_sync_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS connection_secrets (
  connection_id text PRIMARY KEY REFERENCES media_connections(id),
  access_token_encrypted text,
  refresh_token_encrypted text,
  token_expires_at timestamptz,
  secret_version integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ad_accounts (
  id text PRIMARY KEY,
  organization_id text NOT NULL,
  media_id text NOT NULL REFERENCES media_platforms(id),
  external_account_id text NOT NULL,
  name text,
  source_channel_id text,
  timezone text,
  asset_status text NOT NULL DEFAULT 'IDLE',
  media_status text NOT NULL DEFAULT 'UNKNOWN',
  note text,
  first_seen_at timestamptz,
  last_sync_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ad_accounts_org_media_external
  ON ad_accounts (organization_id, media_id, external_account_id);

CREATE TABLE IF NOT EXISTS connection_accounts (
  id text PRIMARY KEY,
  organization_id text NOT NULL,
  connection_id text NOT NULL REFERENCES media_connections(id),
  media_account_id text NOT NULL REFERENCES ad_accounts(id),
  provider_access_status text NOT NULL DEFAULT 'UNKNOWN',
  sync_enabled boolean NOT NULL DEFAULT true,
  is_primary_sync_source boolean NOT NULL DEFAULT false,
  discovered_at timestamptz NOT NULL DEFAULT now(),
  last_verified_at timestamptz,
  last_successful_sync_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sync_jobs (
  id text PRIMARY KEY,
  connection_id text REFERENCES media_connections(id),
  media_id text NOT NULL,
  platform_app_id text,
  impl_key text NOT NULL,
  trigger text NOT NULL DEFAULT 'MANUAL',
  status text NOT NULL DEFAULT 'PENDING',
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text
);

CREATE TABLE IF NOT EXISTS sync_logs (
  id text PRIMARY KEY,
  job_id text NOT NULL REFERENCES sync_jobs(id),
  kind text NOT NULL,
  level text NOT NULL,
  message text NOT NULL,
  at timestamptz NOT NULL DEFAULT now(),
  account_id text,
  discovered_id text
);

-- Preset seed
INSERT INTO media_platforms (id, code, name, status) VALUES
  ('media-meta', 'META', 'Meta', 'ACTIVE'),
  ('media-google', 'GOOGLE', 'Google', 'ACTIVE'),
  ('media-tiktok', 'TIKTOK', 'TikTok', 'ACTIVE'),
  ('media-snapchat', 'SNAPCHAT', 'Snapchat', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

INSERT INTO platform_asset_types (id, media_id, code, name, status) VALUES
  ('pat-meta-bm', 'media-meta', 'BUSINESS_MANAGER', 'BM', 'ACTIVE'),
  ('pat-google-mcc', 'media-google', 'MANAGER_ACCOUNT', 'MCC', 'ACTIVE'),
  ('pat-tiktok-bc', 'media-tiktok', 'BUSINESS_CENTER', 'Business Center', 'ACTIVE'),
  ('pat-snap-org', 'media-snapchat', 'ORGANIZATION', 'Organization', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;
