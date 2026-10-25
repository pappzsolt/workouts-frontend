import { defineConfig } from '@playwright/test';
import personal from './playwright.personal-programs.config';

export default defineConfig({
  ...personal,
  testMatch: /previous-performance\.spec\.ts/,
  outputDir: 'test-results/previous-performance',
});
