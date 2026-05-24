import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  timeout: 90_000,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    trace: 'on-first-retry',
    actionTimeout: 15_000,
  },
  projects: [
    {
      name: 'react',
      testMatch: '**/*.{react,react-only}.spec.ts',
      use: { ...devices['Desktop Chrome'], baseURL: 'http://127.0.0.1:4173' },
    },
    {
      name: 'angular',
      testMatch: '**/*.{angular,angular-only}.spec.ts',
      use: { ...devices['Desktop Chrome'], baseURL: 'http://127.0.0.1:4174' },
    },
  ],
  webServer: {
    command: 'bash scripts/start-e2e-servers.sh',
    url: 'http://127.0.0.1:4173/react/workspace/demo',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
