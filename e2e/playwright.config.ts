import { defineConfig, devices } from '@playwright/test';
import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));

// Single source of config for the whole suite: ports, URLs, secret, credentials.
loadEnv({ path: path.join(here, '.env.e2e') });

const baseURL = process.env.E2E_FRONTEND_URL ?? 'http://localhost:5173';

// Default to Playwright's bundled Chromium (README: `npx playwright install chromium`).
// Set E2E_CHROMIUM_CHANNEL=chrome|msedge to drive a system browser instead.
const channel = process.env.E2E_CHROMIUM_CHANNEL || undefined;

export default defineConfig({
  testDir: path.join(here, 'tests'),

  // The backend clock and database are one shared, mutable service: a test that
  // advances the clock or re-seeds would corrupt a parallel one. Run serially.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 15_000 },

  // globalSetup brings up Postgres + the e2e backend + the frontend, seeds, and saves
  // a storageState per role; globalTeardown stops everything. See playwright/.
  globalSetup: path.join(here, 'playwright', 'globalSetup.ts'),
  globalTeardown: path.join(here, 'playwright', 'globalTeardown.ts'),

  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL,
    // The e2e backend runs over https with a dev cert; the frontend proxies to it.
    ignoreHTTPSErrors: true,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // Video needs the ffmpeg binary; set E2E_VIDEO=off where it isn't installed.
    video: process.env.E2E_VIDEO === 'off' ? 'off' : 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], ...(channel ? { channel } : {}) },
    },
  ],
});
