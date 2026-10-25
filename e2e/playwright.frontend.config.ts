import { defineConfig } from '@playwright/test';
import auth from './playwright.auth.config';

// Explicit allowlist: authentication and registration only, including earlier regression tests.
export default defineConfig({
  ...auth,
  testMatch: /(?:auth-(?:password-recovery|login-resilience)|registration-boundaries|admin-registration-resilience)\.spec\.ts/,
  outputDir: 'frontend-contract-results',
  reporter: [
    ['list'],
    ['html', { outputFolder: 'frontend-contract-report', open: 'never' }],
    ['json', { outputFile: 'frontend-contract-results/results.json' }],
  ],
});
