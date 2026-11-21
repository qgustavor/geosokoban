import { defineConfig, devices } from '@playwright/test'

const path = process.env.BASE_PATH && process.env.BASE_PATH !== './' ? process.env.BASE_PATH : '/'
const serverMode = process.env.E2E_SERVER === 'dev' ? 'dev' : 'preview'
const baseURL = `http://127.0.0.1:4173${path}`

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  use: { baseURL, trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } }
  ],
  webServer: {
    command: `npm run ${serverMode} -- --host 127.0.0.1 --port 4173 --strictPort`,
    url: baseURL,
    reuseExistingServer: !process.env.CI
  }
})
