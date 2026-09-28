# Workouts read-only E2E tests

Playwright E2E tests for coach/user read-only surfaces.

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
npx playwright test tests/coach-readonly.spec.ts --headed
```

User:

```bash
npx playwright test tests/user-readonly.spec.ts --headed
```

All tests:

```bash
npx playwright test --headed
```

## Read-only protection

The suite fails if a test sends POST/PUT/PATCH/DELETE requests, except the authentication endpoints `/auth/login` and `/auth/refresh`.

## Navigation note

Authenticated tests navigate to their target route through the application's SPA navigation performed after login. They intentionally do not call `page.goto()` for authenticated child routes, because a full browser reload can lose application authentication state and produce an empty Angular shell in local development.
