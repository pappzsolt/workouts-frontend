import { test, expect } from '@playwright/test';
import { apiFor, dbOne, dbCount, currentUserId, coachUserId, login, success, rejected, createProgram, createWorkout, createExercise, assignExercise, deleteProgram, deleteWorkout, deleteExercise, suffix, LANGUAGE } from '../../helpers/e2e-next-3-helpers';


test('ROLE MATRIX: USER cannot access COACH/ADMIN-only endpoints', async ({ page }) => {
  await login(page, 'user');
  const api = await apiFor(page);

  const coaches = await success(await api.get('/api/members/coaches'), 'USER all-coaches');
  expect(Array.isArray(coaches.data)).toBeTruthy();

  expect((await api.get('/api/users/name-id')).ok()).toBeFalsy();
  expect((await api.get('/api/roles')).ok()).toBeFalsy();
  expect((await api.get('/api/members/users-with-roles')).ok()).toBeFalsy();
  expect((await api.post('/api/user-programs', { data:{
    userId:null,programName:'Unauthorized',programDescription:'x',durationDays:30,
    startDate:'2035-03-01',difficultyLevel:'intermediate',languageCode:LANGUAGE,workouts:null
  }})).ok()).toBeFalsy();
});

test('ROLE MATRIX: COACH can use coach endpoints but cannot use USER-only profile update', async ({ page }) => {
  await login(page, 'coach');
  const api = await apiFor(page);

  const users = await success(await api.get('/api/users/name-id'), 'COACH users-name-id');
  expect(Array.isArray(users.data)).toBeTruthy();

  const roles = await rejected(await api.get('/api/roles'), 'COACH roles');
  expect(roles).toBeTruthy();

  const profile = await rejected(await api.post('/api/members/me', {
    data:{id:null,type:'user',username:'forbidden',name:null,email:'forbidden@example.invalid',
      passwordHash:null,age:null,weight:null,height:null,gender:null,goals:null,avatarUrl:null,
      coachId:null,phone:null,specialization:null,roleIds:[]}
  }), 'COACH user-profile update');
  expect(profile).toBeTruthy();
});
