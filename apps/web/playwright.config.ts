import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  use: { baseURL: process.env.WEB_TEST_BASE_URL || 'http://127.0.0.1:3210', headless: true, reducedMotion: 'reduce', launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {} },
  webServer: { command: 'PORT=3210 node scripts/serve.mjs', url: 'http://127.0.0.1:3210', reuseExistingServer: true, timeout: 30000 },
  reporter: [['list'], ['json', { outputFile: 'test-results/results.json' }]],
});
