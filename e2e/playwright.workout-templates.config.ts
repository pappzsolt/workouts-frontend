import { defineConfig } from '@playwright/test';
import personal from './playwright.personal-programs.config';
export default defineConfig({
  ...personal,
  testMatch: /workout-templates\.spec\.ts/,
  outputDir: 'test-results/workout-templates',
});
