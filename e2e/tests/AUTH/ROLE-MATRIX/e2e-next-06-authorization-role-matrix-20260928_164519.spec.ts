import { API_ENDPOINTS } from '../../helpers/api-endpoints';
import { test, expect } from '@playwright/test';
import { apiFor, dbOne, dbCount, currentUserId, coachUserId, login, success, rejected, createProgram, createWorkout, createExercise, assignExercise, deleteProgram, deleteWorkout, deleteExercise, suffix, LANGUAGE } from '../../helpers/e2e-next-3-helpers';


test('ROLE MATRIX: USER cannot access COACH/ADMIN-only endpoints', async ({ page }) => {
  await login(page, 'user');
  const api = await apiFor(page);

  const coaches = await success(await api.get(API_ENDPOINTS.members.coaches), 'USER all-coaches');
  expect(Array.isArray(coaches.data)).toBeTruthy();

  await rejected(await api.get(API_ENDPOINTS.users.nameId), 'Role restricted endpoint', 403);
  await rejected(await api.get(API_ENDPOINTS.roles.base), 'Role restricted endpoint', 403);
  await rejected(await api.get(API_ENDPOINTS.members.usersWithRoles), 'Role restricted endpoint', 403);
  await rejected(await api.post(API_ENDPOINTS.userPrograms.base, { data:{
    userId:null,programName:'Unauthorized',programDescription:'x',durationDays:30,
    startDate:'2035-03-01',difficultyLevel:'intermediate',languageCode:LANGUAGE,workouts:null
  }}), 'Role restricted endpoint', 403);
});

test('ROLE MATRIX: COACH can use coach endpoints but cannot use USER-only profile update', async ({ page }) => {
  await login(page, 'coach');
  const api = await apiFor(page);

  const users = await success(await api.get(API_ENDPOINTS.users.nameId), 'COACH users-name-id');
  expect(Array.isArray(users.data)).toBeTruthy();

  const roles = await rejected(await api.get(API_ENDPOINTS.roles.base), 'COACH roles', 403);
  expect(roles).toBeTruthy();

  const profile = await rejected(await api.post(API_ENDPOINTS.members.me, {
    data:{id:null,type:'user',username:'forbidden',name:null,email:'forbidden@example.invalid',
      passwordHash:null,age:null,weight:null,height:null,gender:null,goals:null,avatarUrl:null,
      coachId:null,phone:null,specialization:null,roleIds:[]}
  }), 'COACH user-profile update', 403);
  expect(profile).toBeTruthy();
});
