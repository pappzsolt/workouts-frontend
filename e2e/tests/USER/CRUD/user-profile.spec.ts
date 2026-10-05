import { expect, test } from '@playwright/test';
import { API_ENDPOINTS } from '../../helpers/api-endpoints';
import { anotherCoachClientUserId, apiFor, closeDb, currentUserId, db, dbOne, login, rejected, success, suffix } from '../../helpers/e2e-next-3-helpers';

test.describe.configure({ timeout: 90_000 });
test.afterAll(closeDb);
test('Own profile CRUD: changes persist; request ID, coach and roles cannot redirect/escalate update', async ({ page }) => {
  await login(page,'user'); const api=await apiFor(page);
  const me=await currentUserId(); const other=await anotherCoachClientUserId(me);
  const original=await dbOne('SELECT * FROM users WHERE id=$1',[me]);
  const foreign=await dbOne('SELECT * FROM users WHERE id=$1',[other]);
  expect(original).not.toBeNull(); expect(foreign).not.toBeNull();
  const roles=(await db().query('SELECT * FROM user_roles WHERE user_id=$1 ORDER BY role_id',[me])).rows;
  const adminRole=await dbOne<{id:number}>("SELECT id FROM roles WHERE name IN ('ADMIN','ROLE_ADMIN') ORDER BY id LIMIT 1");
  expect(adminRole).not.toBeNull();
  const goals=`E2E profile ${suffix()}`;
  const payload=(value:string|null)=>({id:other,type:'user',username:original!.username,name:null,email:original!.email,passwordHash:null,avatarUrl:original!.avatar_url,age:original!.age,weight:original!.weight,height:original!.height,gender:original!.gender,goals:value,coachId:999999,roleIds:[adminRole!.id],phone:null,specialization:null});
  try {
    await success(await api.put(API_ENDPOINTS.members.me,{data:payload(goals)}),'Own profile update');
    const changed=await dbOne('SELECT * FROM users WHERE id=$1',[me]);
    expect(changed!.goals).toBe(goals);
    expect(changed!.coach_id).toBe(original!.coach_id);
    expect(changed!.username).toBe(original!.username);
    expect(changed!.email).toBe(original!.email);
    expect(changed!.password_hash).toBe(original!.password_hash);
    expect(await dbOne('SELECT * FROM users WHERE id=$1',[other])).toEqual(foreign);
    expect((await db().query('SELECT * FROM user_roles WHERE user_id=$1 ORDER BY role_id',[me])).rows).toEqual(roles);
    const body=await success(await api.get(`/api/members/users/${me}`),'Read modified own profile');
    expect(body.data.type).toBe('user');
    expect(Number(body.data.id)).toBe(me);
    expect(body.data.extraFields.goals).toBe(goals);
    await rejected(await api.get(API_ENDPOINTS.members.users),'USER cannot list all users',403);
  } finally {
    try {
      await success(await api.put(API_ENDPOINTS.members.me,{data:{...payload(original!.goals),id:null,coachId:original!.coach_id,roleIds:null}}),'Restore own profile');
      const restored=await dbOne('SELECT * FROM users WHERE id=$1',[me]);
      // Verify every business field. Persistence audit timestamps may legitimately change.
      for(const key of ['username','email','avatar_url','age','weight','height','gender','goals','coach_id','password_hash']) expect(restored![key],key).toEqual(original![key]);
    } finally { await api.dispose(); }
  }
});
