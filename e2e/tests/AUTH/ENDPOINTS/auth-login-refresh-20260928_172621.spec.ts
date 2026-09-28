import { test, expect, request } from '@playwright/test';
import { BASE_API_URL } from '../helpers/e2e-next-3-helpers';

test.describe('AUTH: login + refresh token rotation', () => {
  test('AUTH LOGIN: valid credentials return access and refresh tokens', async () => {
    const username = process.env.E2E_USER_USERNAME;
    const password = process.env.E2E_USER_PASSWORD;
    expect(username, 'E2E_USER_USERNAME hiányzik').toBeTruthy();
    expect(password, 'E2E_USER_PASSWORD hiányzik').toBeTruthy();

    const api = await request.newContext({ baseURL: BASE_API_URL });
    try {
      const response = await api.post('/auth/login', { data: { username, password } });
      expect(response.ok()).toBeTruthy();
      const body = await response.json();
      expect(body.success).toBeTruthy();
      expect(body.data?.accessToken).toBeTruthy();
      expect(body.data?.refreshToken).toBeTruthy();
    } finally {
      await api.dispose();
    }
  });

  test('AUTH LOGIN: invalid credentials are rejected', async () => {
    const username = process.env.E2E_USER_USERNAME;
    expect(username, 'E2E_USER_USERNAME hiányzik').toBeTruthy();

    const api = await request.newContext({ baseURL: BASE_API_URL });
    try {
      const response = await api.post('/auth/login', {
        data: { username, password: '__invalid_e2e_password__' },
      });
      expect(response.ok()).toBeFalsy();
      expect([400, 401, 403]).toContain(response.status());
    } finally {
      await api.dispose();
    }
  });

  test('AUTH REFRESH: refresh token rotates and old token cannot be reused', async () => {
    const username = process.env.E2E_USER_USERNAME;
    const password = process.env.E2E_USER_PASSWORD;
    expect(username, 'E2E_USER_USERNAME hiányzik').toBeTruthy();
    expect(password, 'E2E_USER_PASSWORD hiányzik').toBeTruthy();

    const api = await request.newContext({ baseURL: BASE_API_URL });
    try {
      const loginResponse = await api.post('/auth/login', {
        data: { username, password },
      });
      expect(loginResponse.ok()).toBeTruthy();

      const loginBody = await loginResponse.json();
      const refreshToken = loginBody.data?.refreshToken;
      expect(refreshToken).toBeTruthy();

      const refreshResponse = await api.post('/auth/refresh', {
        data: { refreshToken },
      });
      expect(refreshResponse.ok()).toBeTruthy();

      const refreshBody = await refreshResponse.json();
      expect(refreshBody.success).toBeTruthy();
      expect(refreshBody.data?.accessToken).toBeTruthy();
      expect(refreshBody.data?.refreshToken).toBeTruthy();
      expect(refreshBody.data.refreshToken).not.toBe(refreshToken);

      const reusedResponse = await api.post('/auth/refresh', {
        data: { refreshToken },
      });
      expect(reusedResponse.ok()).toBeFalsy();
      expect([400, 401, 403]).toContain(reusedResponse.status());
    } finally {
      await api.dispose();
    }
  });
});
