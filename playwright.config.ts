import { defineConfig, devices } from '@playwright/test'

const PORT = Number(process.env.E2E_PORT ?? 3100)
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } }],
  // runs against the production build, or E2E_BASE_URL if set
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `npm run build && node .output/server/index.mjs`,
        url: baseURL,
        env: { PORT: String(PORT) },
        reuseExistingServer: !process.env.CI,
        timeout: 240_000,
      },
})
