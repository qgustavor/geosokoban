import { defineConfig, devices } from '@playwright/test'

const path = process.env.BASE_PATH && process.env.BASE_PATH !== './' ? process.env.BASE_PATH : '/'
const serverMode = process.env.E2E_SERVER === 'dev' ? 'dev' : 'preview'
const baseURL = `http://127.0.0.1:4173${path}`

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 45000,
  expect: { timeout: 15000 },
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  // Avoid concurrent game workers competing for the CI runner's CPU.
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : 'list',
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
