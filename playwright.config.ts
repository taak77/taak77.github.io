import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  // Playwright specs are *.spec.ts by convention here; tests/ also holds a
  // node:test file (*.check.mjs) and fixtures that Playwright must not execute.
  // The flip side: a spec accidentally named *.test.ts is silently skipped.
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4322',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Port 4322 keeps the test server clear of 4321, which `astro dev` and
  // scripts/compare.sh both use. With reuseExistingServer: false, an occupied
  // port fails loudly instead of silently handing the suite to a server that
  // was never built from this tree.
  webServer: {
    command: 'npm run build && npm run preview -- --port 4322',
    url: 'http://localhost:4322',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
