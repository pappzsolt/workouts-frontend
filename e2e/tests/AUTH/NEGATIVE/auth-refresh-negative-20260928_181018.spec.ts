import { API_ENDPOINTS } from '../../helpers/api-endpoints';
import { test, expect, request } from '@playwright/test';
import { BASE_API_URL } from '../../helpers/e2e-next-3-helpers';

test.describe('AUTH: negative refresh-token validation', () => {
  async function loginUser(api: any): Promise<{ accessToken: string; refreshToken: string }> {
    const username = process.env.E2E_USER_USERNAME;
    const password = process.env.E2E_USER_PASSWORD;

    expect(username, 'E2E_USER_USERNAME hiányzik').toBeTruthy();
    expect(password, 'E2E_USER_PASSWORD hiányzik').toBeTruthy();

    const response = await api.post(API_ENDPOINTS.auth.login, {
      data: { username, password },
    });

    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body.success).toBeTruthy();
    expect(body.data?.accessToken).toBeTruthy();
    expect(body.data?.refreshToken).toBeTruthy();

    return {
      accessToken: body.data.accessToken,
      refreshToken: body.data.refreshToken,
    };
  }

  test('AUTH REFRESH NEGATIVE: missing refreshToken is rejected', async () => {
    const api = await request.newContext({ baseURL: BASE_API_URL });
    try {
      const response = await api.post(API_ENDPOINTS.auth.refresh, {
        data: {},
      });

      expect(response.ok()).toBeFalsy();
      expect([400, 401, 403]).toContain(response.status());
    } finally {
      await api.dispose();
    }
  });

  test('AUTH REFRESH NEGATIVE: malformed refreshToken is rejected', async () => {
    const api = await request.newContext({ baseURL: BASE_API_URL });
    try {
      const response = await api.post(API_ENDPOINTS.auth.refresh, {
        data: { refreshToken: 'not-a-valid-jwt' },
      });

      expect(response.ok()).toBeFalsy();
      expect([400, 401, 403]).toContain(response.status());
    } finally {
      await api.dispose();
    }
  });

  test('AUTH REFRESH NEGATIVE: access token cannot be used as refresh token', async () => {
    const api = await request.newContext({ baseURL: BASE_API_URL });
    try {
      const tokens = await loginUser(api);

      const response = await api.post(API_ENDPOINTS.auth.refresh, {
        data: { refreshToken: tokens.accessToken },
      });

      expect(response.ok()).toBeFalsy();
      expect([400, 401, 403]).toContain(response.status());
    } finally {
      await api.dispose();
    }
  });

  test('AUTH REFRESH NEGATIVE: arbitrary JWT-shaped token is rejected', async () => {
    const api = await request.newContext({ baseURL: BASE_API_URL });
    try {
      const fakeJwt =
        'eyJhbGciOiJIUzI1NiJ9.' +
        'eyJzdWIiOiJ1c2VyIiwidG9rZW5UeXBlIjoicmVmcmVzaCJ9.' +
        'invalid-signature';

      const response = await api.post(API_ENDPOINTS.auth.refresh, {
        data: { refreshToken: fakeJwt },
      });

      expect(response.ok()).toBeFalsy();
      expect([400, 401, 403]).toContain(response.status());
    } finally {
      await api.dispose();
    }
  });
});
