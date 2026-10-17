import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false, // Esecuzione sequenziale ordinata sul DB SQLite
  forbidOnly: !!process.env['CI'],
  retries: 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:4200',
    trace: 'on-first-retry',
    viewport: { width: 1280, height: 800 },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Firefox',
      use: { ...devices['Galaxy S20'] },
    }
  ],
  // Avvia in automatico Back-End (3000) e Front-End (4200) se non sono già accesi
  webServer: [
    {
      command: 'npm start',
      cwd: '../back-end',
      url: 'http://localhost:3000/api/sketches',
      reuseExistingServer: true,
      timeout: 30000,
      env: { QUICKSKETCH_E2E: 'true' },
    },
    {
      command: 'npm start',
      url: 'http://localhost:4200',
      reuseExistingServer: true,
      timeout: 60000,
    },
  ],
});