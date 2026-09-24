import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

let client: ReturnType<typeof postgres> | null = null
let db: ReturnType<typeof drizzle<typeof schema>> | null = null

export function useDb() {
  const config = useRuntimeConfig()
  const url = config.databaseUrl || process.env.DATABASE_URL
  if (!url) {
    throw createError({
      statusCode: 503,
      statusMessage: 'DATABASE_URL not configured. Set DATABASE_URL or use NUXT_PUBLIC_MEDIA_API=mock.'
    })
  }
  if (!client) {
    client = postgres(url, { max: 5 })
    db = drizzle(client, { schema })
  }
  return db!
}

export function hasDatabaseUrl() {
  try {
    const config = useRuntimeConfig()
    return Boolean(config.databaseUrl || process.env.DATABASE_URL)
  } catch {
    return Boolean(process.env.DATABASE_URL)
  }
}
