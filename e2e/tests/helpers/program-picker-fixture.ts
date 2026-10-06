import { expect, type APIRequestContext, type Page } from '@playwright/test';
import { createProgram, createWorkout, deleteProgram, deleteWorkout, suffix } from './e2e-next-3-helpers';

export type ProgramPickerFixture = { programId: number; prefix: string; workouts: Array<{ id: number; name: string }> };
export async function createProgramPickerFixture(api: APIRequestContext, count = 10): Promise<ProgramPickerFixture> {
  const f: ProgramPickerFixture = { programId: await createProgram(api), prefix: `E2E picker ${suffix()}`, workouts: [] };
  try {
    for (let i = 0; i < count; i++) {
      const name = `${f.prefix} ${String(i).padStart(2, '0')}`;
      f.workouts.push({ id: await createWorkout(api, name), name });
    }
    return f;
  } catch (error) {
    try { await cleanupProgramPickerFixture(api, f); }
    catch (cleanupError) { throw new AggregateError([error, cleanupError], 'Picker fixture creation'); }
    throw error;
  }
}
export async function cleanupProgramPickerFixture(api: APIRequestContext, f: ProgramPickerFixture): Promise<void> {
  const errors: unknown[] = [];
  try { await deleteProgram(api, f.programId); } catch (error) { errors.push(error); }
  for (const workout of f.workouts) try { await deleteWorkout(api, workout.id); } catch (error) { errors.push(error); }
  if (errors.length) throw new AggregateError(errors, 'Picker fixture cleanup');
}
export async function openProgramBuilder(page: Page, programId: number): Promise<void> {
  await page.goto(`/coach/program-builder?programId=${programId}`);
  await page.locator('app-coach-program-builder').getByRole('button', { name: /^(program módosítása|modify program|programm ändern)\s*→?$/i }).click();
  await expect(page.locator('app-coach-program-builder-workouts')).toBeVisible();
}
