import { getAuthenticatedAccessToken } from './auth-session';
import { expect, type Page } from '@playwright/test';
import { API_ENDPOINTS } from './api-endpoints';

const BASE_API_URL = process.env.E2E_API_URL ?? 'http://localhost:8080';

export type UserWorkoutApiRecord = Record<string, unknown>;

function readProgramId(program: Record<string, unknown>): number | null {
  const programId = Number(program.id ?? program.programId ?? program.program_id);
  return Number.isInteger(programId) && programId > 0 ? programId : null;
}

export function readUserWorkoutId(workout: UserWorkoutApiRecord): number | null {
  const userWorkoutId = Number(workout.userWorkoutId ?? workout.user_workout_id);
  return Number.isInteger(userWorkoutId) && userWorkoutId > 0 ? userWorkoutId : null;
}

export async function findAssignedProgramWithWorkouts(
  page: Page,
  programs: Array<Record<string, unknown>>,
  options: { requireUserWorkoutId?: boolean } = {},
): Promise<{ programId: number; programIndex: number; workouts: UserWorkoutApiRecord[] }> {
  const token = getAuthenticatedAccessToken(page);
  expect(token, 'A USER login után accessToken szükséges a fixture-felderítéshez.').toBeTruthy();

  const language = process.env.E2E_LANGUAGE ?? 'hu';

  for (let programIndex = 0; programIndex < programs.length; programIndex += 1) {
    const programId = readProgramId(programs[programIndex]);
    if (programId == null) {
      continue;
    }

    const endpoint = API_ENDPOINTS.workouts.byProgram(programId);
    const response = await page.request.get(`${BASE_API_URL}${endpoint}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params: {
        language,
      },
    });

    const responseText = await response.text();
    expect(
      response.ok(),
      `GET ${endpoint} fixture discovery: HTTP ${response.status()} body=${responseText}`,
    ).toBeTruthy();

    let body: { data?: UserWorkoutApiRecord[] };
    try {
      body = responseText ? JSON.parse(responseText) as { data?: UserWorkoutApiRecord[] } : {};
    } catch {
      throw new Error(
        `GET ${endpoint} fixture discovery nem JSON választ adott: ` +
        `HTTP ${response.status()} body=${responseText}`,
      );
    }

    const workouts = Array.isArray(body.data) ? body.data : [];

    if (workouts.length === 0) {
      continue;
    }

    if (options.requireUserWorkoutId && !workouts.some((workout) => readUserWorkoutId(workout) != null)) {
      continue;
    }

    return { programId, programIndex, workouts };
  }

  const requirement = options.requireUserWorkoutId
    ? 'workout occurrence-ot érvényes userWorkoutId-val'
    : 'workout occurrence-ot';

  throw new Error(
    `Az E2E USER-hez van kiosztott program, de egyik kiosztott program sem tartalmaz ${requirement}. ` +
    'A USER workout GUI teszthez megfelelő fixture szükséges.',
  );
}
