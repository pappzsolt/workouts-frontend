import type { Page } from '@playwright/test';
import { test as base, expect, TODAY, type WorkspaceApi } from './workspace-fixture';

type Language = 'hu' | 'en' | 'de';
type Method = 'GET' | 'PUT';
type Gate = { requested: Promise<void>; release(): void };

/** Real frontend HTTP boundary with localized data and explicitly controlled responses. */
export class WorkoutEditorApi {
  readonly texts = {
    hu: { name: 'Magyar edzés', description: 'Magyar leírás' },
    en: { name: 'English workout', description: 'English description' },
    de: { name: 'Deutsches Training', description: 'Deutsche Beschreibung' },
  };
  private readonly held = new Map<string, { requested(): void; released: Promise<void>; release(): void }>();
  private readonly failures = new Set<string>();
  private readonly releases: (() => void)[] = [];

  constructor(private readonly api: WorkspaceApi) {}

  hold(method: Method, language: Language): Gate {
    let requested!: () => void;
    let release!: () => void;
    const result = { requested: new Promise<void>(resolve => requested = resolve), release: () => release() };
    const released = new Promise<void>(resolve => release = resolve);
    this.held.set(`${method}:${language}`, { requested, released, release });
    this.releases.push(release);
    return result;
  }

  failNext(method: Method, language: Language): void {
    this.failures.add(`${method}:${language}`);
  }

  dispose(): void {
    for (const release of this.releases) release();
  }

  async install(page: Page): Promise<void> {
    const workout = {
      id: 30, name: this.texts.hu.name, description: this.texts.hu.description,
      workoutDate: TODAY, durationMinutes: 40, intensityLevel: 'LOW', done: true,
      exercises: this.api.state.exercises.slice(0, 2).map(exercise => ({ ...exercise })),
    };
    this.api.state.workouts.push(workout);
    await page.route(/\/api\/workouts\/30(?:\?|$)/, async route => {
      const request = route.request();
      if (request.method() !== 'GET' && request.method() !== 'PUT') return route.fallback();
      const url = new URL(request.url());
      const language = (url.searchParams.get('language') ?? 'hu') as Language;
      if (!(language in this.texts)) throw new Error(`Unexpected workout language ${language}`);
      const method = request.method() as Method;
      const body = method === 'PUT' ? request.postDataJSON() : null;
      this.api.calls.push({ method, path: url.pathname, query: url.searchParams, body });
      const key = `${method}:${language}`;
      const fail = this.failures.delete(key);
      const text = { ...this.texts[language] };
      const gate = this.held.get(key);
      this.held.delete(key);
      if (gate) {
        gate.requested();
        await gate.released;
      }
      if (fail) return route.fulfill({ status: 503, json: { success: false, message: 'Workout response unavailable', data: null } });
      if (method === 'GET') {
        return route.fulfill({ json: { success: true, message: null, data: {
          workoutId: 30, workoutName: text.name, workoutDescription: text.description,
          workoutDate: workout.workoutDate, durationMinutes: workout.durationMinutes,
          intensityLevel: workout.intensityLevel, dayIndex: 2, done: workout.done,
          userWorkoutId: 70, completed: true, actualSets: 12, feedback: 'Occurrence data',
        } } });
      }
      this.texts[language] = { name: body.name, description: body.description };
      Object.assign(workout, {
        workoutDate: body.workoutDate, durationMinutes: body.durationMinutes,
        intensityLevel: body.intensityLevel, done: body.done,
      });
      await route.fulfill({ json: { success: true, message: null, data: { status: 'ok', id: 30 } } });
    });
  }
}

export const test = base.extend<{ workoutApi: WorkoutEditorApi }>({
  workoutApi: async ({ page, api }, use) => {
    const fixture = new WorkoutEditorApi(api);
    await fixture.install(page);
    const errors: Error[] = [];
    page.on('pageerror', error => errors.push(error));
    try { await use(fixture); } finally { fixture.dispose(); }
    expect(errors, 'Unexpected browser errors').toEqual([]);
  },
});
export { expect, TODAY };
