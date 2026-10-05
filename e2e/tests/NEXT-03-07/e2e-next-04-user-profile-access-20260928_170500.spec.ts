import { API_ENDPOINTS } from '../helpers/api-endpoints';
import { test, expect } from '@playwright/test';
import { apiFor, dbOne, dbCount, currentUserId, coachUserId, login, success, rejected, createProgram, createWorkout, createExercise, assignExercise, deleteProgram, deleteWorkout, deleteExercise, suffix, LANGUAGE } from '../helpers/e2e-next-3-helpers';


test('USER READ: own member and public coach list; protected coach/admin endpoints rejected', async ({ page }) => {
  await login(page, 'user');
  const api = await apiFor(page);
  const userId = await currentUserId();

  const member = await success(await api.get(`/api/members/${userId}`), 'GET own member');
  expect(Number(member.data?.id)).toBe(userId);

  const dbUser = await dbOne<{ id:number; username:string }>(
    `SELECT id,username FROM public.users WHERE id=$1`, [userId]);
  expect(member.data?.type).toBe('user');
  expect(member.data?.usernameOrName).toBe(dbUser?.username);

  const coaches = await success(await api.get(API_ENDPOINTS.members.coaches), 'GET all-coaches');
  expect(coaches.data.length).toBeGreaterThan(0);

  await rejected(await api.get(API_ENDPOINTS.users.nameId), 'Role restricted endpoint', 403);
  await rejected(await api.get(API_ENDPOINTS.roles.base), 'Role restricted endpoint', 403);
  await rejected(await api.post(API_ENDPOINTS.userPrograms.base, { data: {
    userId:null, programName:`Forbidden ${suffix()}`, programDescription:'forbidden',
    durationDays:30, startDate:'2035-03-01', difficultyLevel:'intermediate',
    languageCode:LANGUAGE, workouts:null
  }}), 'Role restricted endpoint', 403);
});
