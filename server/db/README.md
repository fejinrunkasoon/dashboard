# Media access (PlatformApp / OAuth / Connection)

## Modes

- `NUXT_PUBLIC_MEDIA_API=mock` (default): frontend uses in-memory services under `app/services/*`.
- `NUXT_PUBLIC_MEDIA_API=live`: frontend calls `/api/*` (server memory store; optional Postgres).

## Env

```bash
NUXT_PUBLIC_MEDIA_API=mock
TOKEN_ENCRYPTION_KEY=replace-with-32+-char-secret
DATABASE_URL=postgres://postgres:postgres@localhost:5432/ffj   # optional
NUXT_PUBLIC_APP_URL=http://localhost:3000
```

## Postgres

Apply migration:

```bash
psql "$DATABASE_URL" -f server/db/migrations/0001_media_access.sql
```

Schema: `server/db/schema.ts` (Drizzle). Live API currently uses `server/services/media-access-store.ts` (encrypted secrets in memory); wire Drizzle repository when DATABASE_URL is production-ready.

## Meta OAuth (read-only)

1. Super-admin: `/settings` — set real Meta App ID + Secret (not `mock-*` prefix).
2. Business: `/accounts/connections` — connect → authorize.
3. Start URL: `/api/oauth/meta/start?connectionId=...` redirects to Facebook dialog when App ID is non-mock.
4. Callback exchanges code and stores encrypted token; discover uses `me/adaccounts` (`ads_read`).

Google / TikTok: same UI contract; discover returns 501 until adapters are wired.
