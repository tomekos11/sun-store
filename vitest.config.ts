import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// logic in shared/ and server/lib/ is plain TS, so no Nuxt environment needed
export default defineConfig({
  resolve: {
    alias: {
      '#shared': fileURLToPath(new URL('./shared', import.meta.url)),
    },
  },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
})
