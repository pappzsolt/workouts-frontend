import { test, expect } from '@playwright/test';
import { authenticate } from '../helpers/auth-session';
import { API_ENDPOINTS as E } from '../helpers/api-endpoints';
import { apiFor, dbOne, closeDb } from '../helpers/e2e-next-3-helpers';
test.afterAll(closeDb);
test('SQL INJECTION: search treats SQL metacharacters as text; persistent data unchanged',async({page})=>{
 await authenticate(page,'admin');const api=await apiFor(page);
 try{
  const before=await dbOne<{count:string}>('SELECT COUNT(*)::text AS count FROM users');
  const unique=`e2e_nonexistent_${Date.now()}_`;
  const values=[`${unique}' OR '1'='1`, `${unique}%_'\"`, `${unique}'); SELECT 1; --`];
  for(const keyword of values){const response=await api.get(E.members.search,{params:{keyword}});console.log('[API-SECURITY SQLI]',{endpoint:E.members.search,inputLength:keyword.length,status:response.status()});expect(response.status()).toBe(200);const result=await response.json();expect(result.success).toBe(true);expect(Array.isArray(result.data)).toBe(true);expect(result.data).toHaveLength(0);}
  expect(await dbOne('SELECT COUNT(*)::text AS count FROM users')).toEqual(before);
 }finally{await api.dispose();}
});
