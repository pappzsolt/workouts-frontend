import type { Page } from '@playwright/test';

/** A returning account is the precondition for these feature-specific UI contracts. */
export async function returningAccount(page: Page, role: 'coach' | 'user', id: number): Promise<void> {
  await page.addInitScript(({ role, id }) => {
    localStorage.setItem(`workouts-guided-tour:v1:${role}:${id}`, 'done');
  }, { role, id });
}
