// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@vueuse/nuxt'
  ],

  devtools: {
    enabled: false
  },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    /** Server-only: encrypt OAuth tokens / app secrets at rest. */
    tokenEncryptionKey: process.env.TOKEN_ENCRYPTION_KEY || 'dev-only-change-me-32chars!!',
    databaseUrl: process.env.DATABASE_URL || '',
    public: {
      /** mock | live — when live, frontend uses /api media endpoints. */
      mediaApi: process.env.NUXT_PUBLIC_MEDIA_API || 'mock'
    }
  },

  routeRules: {
    '/api/**': {
      cors: true
    }
  },

  icon: {
    clientBundle: {
      scan: true,
      sizeLimitKb: 512
    }
  },

  compatibilityDate: '2026-06-30',

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})