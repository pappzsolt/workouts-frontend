import { API_ENDPOINTS } from '../../helpers/api-endpoints';
import { test, expect } from '@playwright/test';
import {
  apiFor,
  dbOne,
  dbCount,
  currentUserId,
  login,
  success,
  rejected,
  suffix,
} from '../../helpers/e2e-next-3-helpers';

test.describe('MEMBER CONTROLLER: admin CRUD/read + user/coach profile access', () => {
  test('ADMIN MEMBER READ: all → search → all-users → users-with-roles match database', async ({ page }) => {
    await login(page, 'admin');
    const api = await apiFor(page);

    const adminRow = await dbOne<{ id: number }>(
      `SELECT id FROM public.users WHERE username=$1 LIMIT 1`,
      [process.env.E2E_ADMIN_USERNAME ?? 'admin'],
    );
    expect(adminRow).not.toBeNull();

    const all = await success(await api.get(API_ENDPOINTS.members.base), 'GET /api/members');
    const expectedAll = await dbCount(
      `SELECT
         (SELECT COUNT(*) FROM public.users) +
         (SELECT COUNT(*) FROM public.coaches) AS count`,
    );
    expect(all.data.length).toBe(expectedAll);

    const allUsers = await success(
      await api.get(API_ENDPOINTS.members.users),
      'GET /api/members/users',
    );
    expect(allUsers.data.length).toBe(await dbCount(`SELECT COUNT(*) FROM public.users`));
    expect(allUsers.data.some((m: any) => Number(m.id) === Number(adminRow!.id))).toBeTruthy();

    const username = process.env.E2E_ADMIN_USERNAME ?? 'admin';
    const search = await success(
      await api.get(API_ENDPOINTS.members.search, { params: { keyword: username } }),
      'GET /api/members/search',
    );
    expect(search.data.some((m: any) =>
      Number(m.id) === Number(adminRow!.id) ||
      String(m.usernameOrName ?? '').toLowerCase().includes(username.toLowerCase()),
    )).toBeTruthy();

    const withRoles = await success(
      await api.get(API_ENDPOINTS.members.usersWithRoles),
      'GET /api/members/users-with-roles',
    );
    expect(withRoles.data.some((u: any) => Number(u.id) === Number(adminRow!.id))).toBeTruthy();
  });

  test('ADMIN MEMBER UPDATE: POST /api/members updates an existing user and restores the original data', async ({ page }) => {
    await login(page, 'admin');
    const api = await apiFor(page);
    const username = process.env.E2E_ADMIN_USERNAME ?? 'admin';

    const original = await dbOne<any>(
      `SELECT id, username, email, avatar_url, age, weight, height, gender, goals, coach_id
         FROM public.users
        WHERE username=$1
        LIMIT 1`,
      [username],
    );
    expect(original).not.toBeNull();

    const changedGoals = `E2E member-controller ${suffix()}`;

    const payload = (goals: string | null) => ({
      id: Number(original!.id),
      type: 'user',
      username: original!.username,
      name: null,
      email: original!.email,
      passwordHash: null,
      age: original!.age,
      weight: original!.weight,
      height: original!.height,
      gender: original!.gender,
      goals,
      avatarUrl: original!.avatar_url,
      coachId: original!.coach_id,
      phone: null,
      specialization: null,
      roleIds: null,
    });

    try {
      await success(
        await api.post(API_ENDPOINTS.members.base, { data: payload(changedGoals) }),
        'POST /api/members update user',
      );

      const changed = await dbOne<any>(
        `SELECT goals FROM public.users WHERE id=$1`,
        [original!.id],
      );
      expect(changed?.goals).toBe(changedGoals);
    } finally {
      await success(
        await api.post(API_ENDPOINTS.members.base, { data: payload(original!.goals) }),
        'POST /api/members restore user',
      );
    }
  });

  test('USER PROFILE: own profile update works; admin-only member endpoints reject', async ({ page }) => {
    await login(page, 'user');
    const api = await apiFor(page);
    const userId = await currentUserId();

    const original = await dbOne<any>(
      `SELECT username, email, avatar_url, age, weight, height, gender, goals, coach_id
         FROM public.users WHERE id=$1`,
      [userId],
    );
    expect(original).not.toBeNull();

    const changedGoals = `E2E user profile ${suffix()}`;

    const payload = (goals: string | null) => ({
      id: null,
      type: 'user',
      username: original!.username,
      name: null,
      email: original!.email,
      passwordHash: null,
      age: original!.age,
      weight: original!.weight,
      height: original!.height,
      gender: original!.gender,
      goals,
      avatarUrl: original!.avatar_url,
      coachId: null,
      phone: null,
      specialization: null,
      roleIds: null,
    });

    try {
      await success(
        await api.post(API_ENDPOINTS.members.me, { data: payload(changedGoals) }),
        'POST /api/members/me',
      );

      const changed = await dbOne<any>(
        `SELECT goals FROM public.users WHERE id=$1`,
        [userId],
      );
      expect(changed?.goals).toBe(changedGoals);

      await rejected(await api.get(API_ENDPOINTS.members.base), 'USER GET /api/members');
      await rejected(await api.get(API_ENDPOINTS.members.users), 'USER GET /api/members/users');
      await rejected(
        await api.post(API_ENDPOINTS.members.base, { data: { type: 'user' } }),
        'USER POST /api/members',
      );
    } finally {
      await success(
        await api.post(API_ENDPOINTS.members.me, {
          data: {
            ...payload(original!.goals),
            coachId: original!.coach_id,
          },
        }),
        'POST /api/members/me restore',
      );
    }
  });

  test('COACH PROFILE: PUT /api/members/me/coach updates only own coach profile and restores it', async ({ page }) => {
    await login(page, 'coach');
    const api = await apiFor(page);

    const original = await dbOne<any>(
      `SELECT c.id, c.name, c.email, c.avatar_url, c.phone, c.specialization
         FROM public.coaches c
        WHERE c.name=$1 OR c.email=$1
        LIMIT 1`,
      [process.env.E2E_COACH_USERNAME],
    );
    expect(original).not.toBeNull();

    const changedSpecialization =
      `${original!.specialization ?? ''} E2E ${suffix()}`.trim();

    const payload = (specialization: string | null) => ({
      id: null,
      type: 'coach',
      username: null,
      name: original!.name,
      email: original!.email,
      passwordHash: null,
      age: null,
      weight: null,
      height: null,
      gender: null,
      goals: null,
      avatarUrl: original!.avatar_url,
      coachId: null,
      phone: original!.phone,
      specialization,
      roleIds: null,
    });

    try {
      await success(
        await api.put(API_ENDPOINTS.members.meCoach, {
          data: payload(changedSpecialization),
        }),
        'PUT /api/members/me/coach',
      );

      const changed = await dbOne<any>(
        `SELECT specialization FROM public.coaches WHERE id=$1`,
        [original!.id],
      );
      expect(changed?.specialization).toBe(changedSpecialization);
    } finally {
      await success(
        await api.put(API_ENDPOINTS.members.meCoach, {
          data: payload(original!.specialization),
        }),
        'PUT /api/members/me/coach restore',
      );
    }
  });
});
