import { expect, test, type APIResponse } from '@playwright/test';
import { expectRejected } from '../../helpers/expect-rejected';

// Helper unit tests only; application E2E tests use real HTTP and PostgreSQL.
function response(status: number, body: unknown): APIResponse {
  return { status: () => status, text: async () => JSON.stringify(body) } as APIResponse;
}

test('Negative helper accepts only the expected status and success=false', async () => {
  expect(await expectRejected(response(403,{success:false}), 'ownership',403)).toEqual({success:false});
  await expect(expectRejected(response(500,{success:false}),'ownership',403)).rejects.toThrow();
  await expect(expectRejected(response(404,{success:false}),'ownership',403)).rejects.toThrow();
  await expect(expectRejected(response(403,{success:true}),'ownership',403)).rejects.toThrow();
  await expect(expectRejected(response(403,{}),'ownership',403)).rejects.toThrow();
  await expect(expectRejected(response(500,{success:false}),'invalid expected status',[400,500])).rejects.toThrow();
});
