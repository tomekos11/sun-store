// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/ui', '@nuxt/eslint'],

  devtools: { enabled: true },

  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
      meta: [{ name: 'theme-color', content: '#b45309' }],
    },
  },

  css: ['~/assets/css/main.css'],

  ui: {
    // only generate CSS for used components (CSS went from 211 KB to 96 KB)
    experimental: { componentDetection: true },
  },

  runtimeConfig: {
    public: {
      // canonical / og:url, falls back to request origin
      siteUrl: '',
    },
  },

  routeRules: {
    '/api/products': {
      headers: { 'cache-control': 'public, max-age=60, s-maxage=600, stale-while-revalidate=86400' },
    },
  },

  compatibilityDate: '2026-10-01',

  nitro: {
    compressPublicAssets: true,
  },

  typescript: {
    strict: true,
  },

  eslint: {
    config: { stylistic: true },
  },

  icon: {
    // bundle used icons instead of fetching them at runtime
    clientBundle: { scan: true },
    serverBundle: { collections: ['lucide'] },
  },
})
