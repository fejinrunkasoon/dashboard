import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex
} from 'drizzle-orm/pg-core'

const ts = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
}

export const mediaPlatforms = pgTable('media_platforms', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  logoUrl: text('logo_url'),
  status: text('status').notNull().default('ACTIVE'),
  ...ts
})

export const platformAssetTypes = pgTable('platform_asset_types', {
  id: text('id').primaryKey(),
  mediaId: text('media_id').notNull().references(() => mediaPlatforms.id),
  code: text('code').notNull(),
  name: text('name').notNull(),
  status: text('status').notNull().default('ACTIVE'),
  ...ts
}, table => [
  uniqueIndex('platform_asset_types_media_code').on(table.mediaId, table.code)
])

export const platformApps = pgTable('platform_apps', {
  id: text('id').primaryKey(),
  mediaId: text('media_id').notNull().references(() => mediaPlatforms.id),
  appId: text('app_id').notNull(),
  secretEncrypted: text('secret_encrypted'),
  developerTokenEncrypted: text('developer_token_encrypted'),
  status: text('status').notNull().default('ACTIVE'),
  isDefault: boolean('is_default').notNull().default(true),
  redirectUriHint: text('redirect_uri_hint'),
  ...ts
})

export const mediaConnections = pgTable('media_connections', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull(),
  teamId: text('team_id').notNull(),
  mediaId: text('media_id').notNull().references(() => mediaPlatforms.id),
  platformAppId: text('platform_app_id').references(() => platformApps.id),
  displayName: text('display_name').notNull(),
  authorizedByUserId: text('authorized_by_user_id').notNull(),
  status: text('status').notNull().default('PENDING_AUTH'),
  providerIdentityId: text('provider_identity_id'),
  providerIdentityName: text('provider_identity_name'),
  scopes: jsonb('scopes').$type<string[]>().notNull().default([]),
  isMock: boolean('is_mock').notNull().default(false),
  authorizedAt: timestamp('authorized_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  lastVerifiedAt: timestamp('last_verified_at', { withTimezone: true }),
  lastSyncAt: timestamp('last_sync_at', { withTimezone: true }),
  ...ts
})

export const connectionSecrets = pgTable('connection_secrets', {
  connectionId: text('connection_id').primaryKey().references(() => mediaConnections.id),
  accessTokenEncrypted: text('access_token_encrypted'),
  refreshTokenEncrypted: text('refresh_token_encrypted'),
  tokenExpiresAt: timestamp('token_expires_at', { withTimezone: true }),
  secretVersion: integer('secret_version').notNull().default(1),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
})

export const adAccounts = pgTable('ad_accounts', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull(),
  mediaId: text('media_id').notNull().references(() => mediaPlatforms.id),
  externalAccountId: text('external_account_id').notNull(),
  name: text('name'),
  sourceChannelId: text('source_channel_id'),
  timezone: text('timezone'),
  assetStatus: text('asset_status').notNull().default('IDLE'),
  mediaStatus: text('media_status').notNull().default('UNKNOWN'),
  note: text('note'),
  firstSeenAt: timestamp('first_seen_at', { withTimezone: true }),
  lastSyncAt: timestamp('last_sync_at', { withTimezone: true }),
  ...ts
}, table => [
  uniqueIndex('ad_accounts_org_media_external').on(
    table.organizationId,
    table.mediaId,
    table.externalAccountId
  )
])

export const connectionAccounts = pgTable('connection_accounts', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull(),
  connectionId: text('connection_id').notNull().references(() => mediaConnections.id),
  mediaAccountId: text('media_account_id').notNull().references(() => adAccounts.id),
  providerAccessStatus: text('provider_access_status').notNull().default('UNKNOWN'),
  syncEnabled: boolean('sync_enabled').notNull().default(true),
  isPrimarySyncSource: boolean('is_primary_sync_source').notNull().default(false),
  discoveredAt: timestamp('discovered_at', { withTimezone: true }).notNull().defaultNow(),
  lastVerifiedAt: timestamp('last_verified_at', { withTimezone: true }),
  lastSuccessfulSyncAt: timestamp('last_successful_sync_at', { withTimezone: true }),
  ...ts
})

export const syncJobs = pgTable('sync_jobs', {
  id: text('id').primaryKey(),
  connectionId: text('connection_id').references(() => mediaConnections.id),
  mediaId: text('media_id').notNull(),
  platformAppId: text('platform_app_id'),
  implKey: text('impl_key').notNull(),
  trigger: text('trigger').notNull().default('MANUAL'),
  status: text('status').notNull().default('PENDING'),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
  stats: jsonb('stats').$type<Record<string, number>>().notNull().default({}),
  errorMessage: text('error_message')
})

export const syncLogs = pgTable('sync_logs', {
  id: text('id').primaryKey(),
  jobId: text('job_id').notNull().references(() => syncJobs.id),
  kind: text('kind').notNull(),
  level: text('level').notNull(),
  message: text('message').notNull(),
  at: timestamp('at', { withTimezone: true }).notNull().defaultNow(),
  accountId: text('account_id'),
  discoveredId: text('discovered_id')
})
