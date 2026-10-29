// https://nuxt.com/docs/api/configuration/nuxt-config
import { QUERY_KEYS } from './shared/utils/filters'

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
    '/': { isr: { expiration: false, allowQuery: QUERY_KEYS } },
    '/api/products': {
      headers: { 'cache-control': 'public, max-age=60, s-maxage=600, stale-while-revalidate=86400' },
    },
  },

  experimental: {
    // with ISR Nuxt would fetch _payload.json before every filter navigation, which delays
    // the checkbox/URL update. The page loads its data with useFetch anyway.
    payloadExtraction: false,
  },

  compatibilityDate: '2026-10-01',

  nitro: {
    compressPublicAssets: true,
    // closer to european customers than the default iad1
    vercel: { functions: { regions: ['fra1'] } },
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
