'use strict';

const { defineConfig, devices } = require('@playwright/test');
const path = require('node:path');
const { BASE_URL } = require('./lib/journey-config');
const { resolveReportsDir } = require('./lib/report-run');

const REPORTS_DIR =
  resolveReportsDir(path.join(__dirname, 'reports'), process.env);
process.env.PERF_RUN_REPORTS_DIR = REPORTS_DIR;

module.exports = defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: {
    timeout: 15_000
  },
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ['list'],
    ['json', { outputFile: path.join(REPORTS_DIR, 'playwright-results.json') }],
    ['html', { open: 'never', outputFolder: path.join(REPORTS_DIR, 'playwright-report') }]
  ],
  outputDir: path.join(REPORTS_DIR, 'test-results'),
  use: {
    baseURL: BASE_URL,
    headless: true,
    viewport: { width: 1280, height: 720 },
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    launchOptions: {
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    }
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } }
    }
  ]
});
