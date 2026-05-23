import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command:
      'npm run build -w @ncs_software/widget-system && npm run build -w @ncs_software/widget-system-react && npm run build -w demo-react && npm run preview -w demo-react -- --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173/react/workspace/demo',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
