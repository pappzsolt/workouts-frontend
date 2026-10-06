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

Tests that install the read-only guard fail if a test sends POST/PUT/PATCH/DELETE requests, except the actual login, refresh and logout endpoints under `/auth/web`, plus the token-based API login/refresh endpoints.

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

GUI tests sign in through the actual login form. The frontend keeps its access token in memory and uses a HttpOnly refresh cookie;
the tests verify its real login response, cookie attributes and role redirect.
API fixture clients use only the access token observed in that browser login or
its actual authorized requests. Tokens are never injected into browser storage. Authenticated navigation uses
`page.goto()` and verifies the application's persisted session.

Use accessible button names and labels instead of icon classes or wrapper depth.
`app-select` renders a native select. String values can be selected by value;
for numeric IDs, select the visible option label and verify the resulting form
or API behavior. Do not parse Angular's internal `ngValue` DOM representation.

Run without retries when validating a fix:

```bash
npx playwright test --retries=0
```

## Current shared UI contracts

The coach dashboard has six actions, including program assignment. GUI tests
address actions by their accessible names. Exercise search uses the exact Search
button; Clear search is a separate action.

User program cards contain real navigation links. The occurrence navigation test
opens the link with Enter and checks the program route and name query parameter.
Workout tests check the exact `userWorkoutId` of the selected occurrence.

Shared pagination exposes named previous/next buttons and a labelled native
page-size select. Numeric options are selected by their visible label. The
statistics fixture creates 13 programs to check both 6-item and 12-item pages,
including resetting to page one after changing size. Cleanup uses the backend API.

Admin tests cover shared new/edit actions, member cards and pagination, local
search clearing, and audit filters and page sizes against actual API responses.
Tests do not intercept or replace application responses.

Type checking requires the frontend dependencies as well as E2E dependencies:

```bash
cd e2e
npm run typecheck
npx playwright test --list
npx playwright test --retries=0
```

Discovery and type checking are separate from execution. The backend must run
for authenticated GUI/API/DB validation; skipping tests or substituting responses
does not validate those flows.

The suite keeps one worker and sequential execution, but independent tests do not
use serial failure-skipping groups. A failure must not suppress later independent
checks. The web session tests distinguish normal SPA navigation from restoring
the session after a protected-page reload.

## Business regression coverage

Additional regressions follow the existing role/GUI/SETS directories and shared
API/auth/DB helpers:

- Web logout revokes the refresh cookie; back, reload and protected navigation
  cannot restore access. Direct subpage navigation and reload preserve the exact
  target for admin, coach and user, with one refresh per document load.
- Program switching discards pending workout selection and writes only to the
  active program. Coach set editing is verified through GUI, DB, reload and the
  owner's API read. Repeated workout occurrences keep separate completion data.
- Picker search resets pagination, and selections survive filtering, clearing
  and page changes. Double-click submission produces one write and one occurrence.
- GUI workout copying creates independent metadata and relationship records.
  Historical program deletion shows the real 409 and preserves the full DB
  snapshot. Language changes preserve entered program values through persistence.
- Admin filtered editing updates the precise fixture ID and preserves the other
  fixture user and roles.

Fixtures are created and removed through real application APIs. The admin edit
fixture is the exception: no member deletion API exists, so its two newly created
users are removed by ID and unique username prefix through SQL, matching the
existing AUTH/DB fixture lifecycle. This SQL is used only for fixture cleanup;
the admin edit itself runs through the real GUI/API and is verified in PostgreSQL.
