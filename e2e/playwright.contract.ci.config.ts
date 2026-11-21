import { defineConfig } from '@playwright/test';
import contractConfig from './playwright.contract.config';

// CI-only selection: preserve the existing full desktop/mobile contract config.
// Running both projects in one Playwright invocation retains a single JUnit report
// (separate sequential runs would clear the shared output directory).
export default defineConfig(contractConfig, {
  projects: (contractConfig.projects ?? []).map((project) => ({
    ...project,
    grep: project.name === 'mobile' ? /@ci-mobile/ : /@ci-workouts/,
  })),
});
