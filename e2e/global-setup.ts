/**
 * Globális előkészítés: a tesztek egy „alapadat-készletet” feltételeznek az .env-ben megadott
 * fiókok mellé (pl. a coachnak van programja, az E2E usernek van kiosztott edzése). Egy takarított
 * adatbázisban (Liquibase reset után) ezek hiányoznak, ezért itt – a valódi API-n keresztül,
 * idempotensen – létrehozzuk őket. Ha már megvannak, semmit nem módosít.
 *
 *  - az E2E_COACH-nak van még egy ügyfele (e2e-alap-ugyfel2),
 *  - az E2E_COACH-nak van programja két edzéssel, kiosztva az E2E_USER-nek és a második ügyfélnek,
 *  - van egy másik coach (e2e-alap-masik-coach) saját ügyféllel és kiosztott programmal
 *    (a jogosultsági tesztek „idegen” adataihoz).
 *
 * Kihagyás: E2E_SKIP_BASELINE=1.
 */
import { expect, request, type APIRequestContext, type FullConfig } from '@playwright/test';
import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

const API_URL = (process.env.E2E_API_URL ?? 'http://localhost:8080').replace(/\/+$/, '');
const BASELINE_PASSWORD = 'E2e-Alapadat-2026!';
const CLIENT2 = 'e2e-alap-ugyfel2';
const OTHER_COACH = 'e2e-alap-masik-coach';
const OTHER_CLIENT = 'e2e-alap-masik-ugyfel';
const PROGRAM = 'E2E alap program';
const OTHER_PROGRAM = 'E2E alap idegen program';

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Hiányzó környezeti változó: ${name} (e2e/.env)`);
  return value;
}

function isoDate(daysFromToday: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

class Api {
  constructor(private readonly ctx: APIRequestContext, private readonly token: string) {}
  private async call<T>(method: 'get' | 'post' | 'put', path: string, data?: unknown, params?: Record<string, string | number>): Promise<T> {
    const response = await this.ctx[method](API_URL + path, { headers: { Authorization: `Bearer ${this.token}` }, data, params });
    const text = await response.text();
    expect(response.ok(), `Alapadat: ${method.toUpperCase()} ${path} → HTTP ${response.status()} ${text}`).toBe(true);
    const body = text ? JSON.parse(text) : null;
    return body?.data as T;
  }
  get<T = any>(path: string, params?: Record<string, string | number>) { return this.call<T>('get', path, undefined, params); }
  post<T = any>(path: string, data?: unknown, params?: Record<string, string | number>) { return this.call<T>('post', path, data ?? {}, params); }
  put<T = any>(path: string, data?: unknown, params?: Record<string, string | number>) { return this.call<T>('put', path, data ?? {}, params); }
}

async function tryLogin(ctx: APIRequestContext, username: string, password: string): Promise<Api | null> {
  const response = await ctx.post(`${API_URL}/api/auth/login`, { data: { username, password } });
  if (!response.ok()) return null;
  return new Api(ctx, (await response.json()).data.accessToken);
}

async function login(ctx: APIRequestContext, username: string, password: string): Promise<Api> {
  const api = await tryLogin(ctx, username, password);
  expect(api, `Alapadat: sikertelen bejelentkezés (${username}) – ellenőrizd az e2e/.env-et.`).not.toBeNull();
  return api!;
}

export default async function globalSetup(_config: FullConfig): Promise<void> {
  if (process.env.E2E_SKIP_BASELINE === '1') return;
  const pool = new Pool({
    host: env('E2E_DB_HOST'), port: Number(process.env.E2E_DB_PORT ?? 5432), database: env('E2E_DB_NAME'),
    user: env('E2E_DB_USER'), password: env('E2E_DB_PASSWORD'),
    ssl: process.env.E2E_DB_SSL === 'true' ? { rejectUnauthorized: false } : false, max: 2,
  });
  const q = async <T = any>(sql: string, params: unknown[] = []) => (await pool.query(sql, params)).rows as T[];
  const idOf = async (table: 'users' | 'coaches', column: 'username' | 'name', value: string) =>
    (await q<{ id: number }>(`SELECT id FROM ${table} WHERE ${column} = $1`, [value]))[0]?.id ?? null;
  const ctx = await request.newContext();
  try {
    const admin = await login(ctx, env('E2E_ADMIN_USERNAME'), env('E2E_ADMIN_PASSWORD'));
    const roles = await admin.get<{ id: number; name: string }[]>('/api/roles');
    const roleId = (name: string) => roles.find(r => r.name === name)!.id;

    const coachName = env('E2E_COACH_USERNAME');
    const userName = env('E2E_USER_USERNAME');
    const coachId = await idOf('coaches', 'name', coachName);
    const userId = await idOf('users', 'username', userName);
    if (!coachId || !userId) throw new Error(`Az E2E_COACH (${coachName}) és az E2E_USER (${userName}) fióknak léteznie kell.`);
    const owner = (await q<{ coach_id: number | null }>('SELECT coach_id FROM users WHERE id = $1', [userId]))[0].coach_id;
    if (owner !== coachId) throw new Error(`Az E2E_USER (${userName}) nem az E2E_COACH (${coachName}) ügyfele; állítsd be az admin felületen.`);

    const ensureUser = async (username: string, ownerCoachId: number) => {
      const existing = await idOf('users', 'username', username);
      if (existing) return existing;
      await admin.post('/api/members', {
        type: 'user', username, email: `${username}@e2e.test`, password: BASELINE_PASSWORD, coachId: ownerCoachId,
        age: 30, weight: 70, height: 175, gender: 'FEMALE', goals: 'Alapadat', roleIds: [roleId('USER')],
      });
      return (await idOf('users', 'username', username))!;
    };
    const client2 = await ensureUser(CLIENT2, coachId);

    let otherCoachId = await idOf('coaches', 'name', OTHER_COACH);
    if (!otherCoachId) {
      await admin.post('/api/members', {
        type: 'coach', name: OTHER_COACH, email: `${OTHER_COACH}@e2e.test`, password: BASELINE_PASSWORD,
        phone: '+36301234567', specialization: 'Alapadat', roleIds: [roleId('COACH')],
      });
      otherCoachId = (await idOf('coaches', 'name', OTHER_COACH))!;
    }
    const otherClient = await ensureUser(OTHER_CLIENT, otherCoachId);

    const ensureProgram = async (api: Api, ownerCoachId: number, name: string, clients: number[]) => {
      const exists = await q(`SELECT p.id FROM programs p JOIN program_translations pt ON pt.program_id = p.id
                               WHERE p.coach_id = $1 AND pt.name = $2`, [ownerCoachId, name]);
      if (exists.length) return;
      const exercises = (await api.get<{ content: { id: number }[] }>('/api/exercises/search', {
        language: 'hu', search: '', page: 0, size: 3, sortDirection: 'asc',
      })).content;
      if (exercises.length < 2) throw new Error('Az alapadatokhoz legalább 2 gyakorlat kell a gyakorlattörzsben.');
      const workout = async (workoutName: string, items: [number, number, number, number][]) => {
        const created = await api.post<{ id: number }>('/api/workouts', { name: workoutName, workoutDate: isoDate(0) }, { language: 'hu' });
        for (const [exerciseId, sets, repetitions, restSeconds] of items) {
          await api.post('/api/workout-exercises', null, { workoutId: created.id, exerciseId });
          await api.put('/api/workout-exercises/prescription', { sets, repetitions, restSeconds }, { workoutId: created.id, exerciseId });
        }
        return created.id;
      };
      const a = await workout(`${name} A`, [[exercises[0].id, 3, 10, 60], [exercises[1].id, 2, 12, 45]]);
      const b = await workout(`${name} B`, [[exercises[1].id, 3, 8, 90]]);
      const programId = await api.post<number>('/api/user-programs', {
        programName: name, programDescription: `${name} – automatikus tesztadat`, durationDays: 60,
        difficultyLevel: 'INTERMEDIATE', startDate: isoDate(-7), languageCode: 'hu', workouts: [],
      });
      for (const [day, workoutId] of [[1, a], [3, b], [8, a], [10, b], [15, a]] as const) {
        await api.post('/api/program-workouts', { programId, workoutId, dayIndex: day });
      }
      for (const client of clients) await api.post('/api/programs/assign', { userId: client, programId });
    };

    await ensureProgram(await login(ctx, coachName, env('E2E_COACH_PASSWORD')), coachId, PROGRAM, [userId, client2]);
    // A másik coach a mi segédfiókunk: ha a jelszava eltér (pl. régebbi futásból), az admin visszaállítja.
    let otherCoachApi = await tryLogin(ctx, OTHER_COACH, BASELINE_PASSWORD);
    if (!otherCoachApi) {
      const row = (await q<{ email: string }>('SELECT email FROM coaches WHERE id = $1', [otherCoachId]))[0];
      await admin.post('/api/members', {
        id: otherCoachId, type: 'coach', name: OTHER_COACH, email: row.email, password: BASELINE_PASSWORD,
        phone: '+36301234567', specialization: 'Alapadat',
      });
      otherCoachApi = await login(ctx, OTHER_COACH, BASELINE_PASSWORD);
    }
    await ensureProgram(otherCoachApi, otherCoachId, OTHER_PROGRAM, [otherClient]);
  } finally {
    await ctx.dispose();
    await pool.end();
  }
}
