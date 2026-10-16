import { test, expect } from '@playwright/test';
import { authenticate } from '../helpers/auth-session';
import { API_ENDPOINTS as E } from '../helpers/api-endpoints';
import { apiFor } from '../helpers/e2e-next-3-helpers';
test('RBAC: USER cannot access COACH/ADMIN endpoints; COACH cannot access ADMIN',async ({browser})=>{
  for(const [role,endpoints] of [['user',[E.members.base,E.workouts.my,E.programs.coach]],['coach',[E.members.base,E.members.search+'?keyword=e2e']]] as const){
    const context=await browser.newContext();
    try {const page=await context.newPage();await authenticate(page,role);const api=await apiFor(page);
      try {for(const endpoint of endpoints){const response=await api.get(endpoint);console.log('[API-SECURITY RBAC]',{role,endpoint,status:response.status()});expect(response.status(),`${role} -> ${endpoint}`).toBe(403);}}
      finally {await api.dispose();}
    }finally{await context.close();}
  }
});
