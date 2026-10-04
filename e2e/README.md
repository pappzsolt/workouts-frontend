# Workouts Playwright E2E tests

Playwright GUI, API, CRUD and read-only tests for admin, coach and user flows.

## Setup

```bash
cd e2e
npm install
cp .env.example .env
```

Fill in the existing test-user credentials and PostgreSQL read-only connection values in `.env`.

## Run

Coach:

```bash
npx playwright test tests/COACH/READ/coach-readonly.spec.ts --headed
```

User:

```bash
npx playwright test tests/USER/READ/user-readonly.spec.ts --headed
```

All tests:

```bash
npx playwright test --headed
```

## Read-only protection

Tests that install the read-only guard fail if a test sends POST/PUT/PATCH/DELETE requests, except the authentication endpoints `/auth/login` and `/auth/refresh`.

## Runtime prerequisites

Start the current frontend on `E2E_BASE_URL` (default `http://localhost:4200`)
and the backend on `E2E_API_URL` (default `http://localhost:8080`).
Use a dedicated test database: CRUD tests create, update and clean up real records.

The backend must allow the frontend origin through CORS. For local development,
include `http://localhost:4200` in `CORS_ALLOWED_ORIGINS` and restart the backend
after changing it. An origin contains only scheme, host and port, never `/login`.
An environment variable overrides the backend profile's default CORS setting.
Do not disable browser security or intercept responses to bypass CORS failures.

## Navigation and shared controls

GUI tests sign in through the actual login form. The frontend stores its own
tokens and performs its role-based redirect. Authenticated navigation uses
`page.goto()` and verifies the application's persisted session.

Use accessible button names and labels instead of icon classes or wrapper depth.
`app-select` renders a native select. String values can be selected by value;
for numeric IDs, select the visible option label and verify the resulting form
or API behavior. Do not parse Angular's internal `ngValue` DOM representation.

Run without retries when validating a fix:

```bash
npx playwright test --retries=0
```
