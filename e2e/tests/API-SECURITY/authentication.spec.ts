import { test, expect, request } from '@playwright/test';
import { API_ENDPOINTS as E } from '../helpers/api-endpoints';
import { BASE_API_URL } from '../helpers/e2e-next-3-helpers';
test('AUTH: protected admin endpoint rejects missing and malformed JWT', async () => {
  const endpoint = E.members.base;
  const expired = `${Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')}.${Buffer.from(JSON.stringify({sub:'e2e-expired',exp:1,roles:'ROLE_ADMIN'})).toString('base64url')}.invalid-signature`;
  for (const [label, bearer] of [['no-token',null],['malformed','not-a-jwt'],['expired-claim-with-invalid-signature',expired]] as const) {
    const ctx = await request.newContext({baseURL:BASE_API_URL,extraHTTPHeaders: bearer?{Authorization:`Bearer ${bearer}`}:{}});
    try { const response = await ctx.get(endpoint); console.log('[API-SECURITY AUTH]',{label,endpoint,status:response.status()}); expect(response.status(),label).toBe(401); }
    finally { await ctx.dispose(); }
  }
});
