import { defineConfig, devices } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const authFile = path.join(__dirname, '.auth', 'cloudflare-swagger.json');
const adminUser = process.env.SWAGGER_ADMIN_USER;
const adminPassword = process.env.SWAGGER_ADMIN_PASSWORD;

export default defineConfig({
  testDir: './tests/NGINX',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report-nginx', open: 'never' }]],
  timeout: 45_000,
  use: {
    ...devices['Desktop Chrome'],
    baseURL: process.env.NGINX_BASE_URL || 'https://workouts.hevexora.com',
    storageState: fs.existsSync(authFile) ? authFile : undefined,
    httpCredentials: adminUser && adminPassword ? { username: adminUser, password: adminPassword } : undefined,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    navigationTimeout: 25_000,
  },
  projects: [{ name: 'chromium' }],
});
