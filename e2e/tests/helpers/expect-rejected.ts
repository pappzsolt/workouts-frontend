import { expect, type APIResponse } from '@playwright/test';

/** Negative assertions require the endpoint's explicit contract, including its error envelope. */
export async function expectRejected(
  response: APIResponse,
  label: string,
  expectedStatus: number | readonly number[],
): Promise<any> {
  const statuses = typeof expectedStatus === 'number' ? [expectedStatus] : [...expectedStatus];
  if (!statuses.length || statuses.some(status => status < 400 || status >= 500)) {
    throw new Error(`${label}: expectedStatus must contain explicit 4xx statuses.`);
  }
  const text = await response.text();
  expect(statuses, `${label}: HTTP ${response.status()} ${text}`).toContain(response.status());
  const body = JSON.parse(text);
  expect(body?.success, `${label}: missing or invalid API error envelope: ${text}`).toBe(false);
  return body;
}
