# GymTracker Mobile v1 – strict E2E suite

This package adds a dedicated Playwright API/E2E suite for the three mobile REST endpoints:

- `GET /api/mobile/v1/snapshot?language=hu`
- `GET /api/mobile/v1/user-workouts/{id}?language=hu`
- `PUT /api/mobile/v1/user-workouts/{id}/state`

## Test philosophy

These tests intentionally do not weaken, skip, mask, or bypass backend behavior.

They use:
- the real authentication flow;
- the real HTTP endpoints;
- PostgreSQL reads for independent verification;
- real API-created fixtures for write tests;
- cleanup through the real backend API.

A missing required fixture is a test failure, not a skip.

## Coverage

### Snapshot
- user-scoped assigned-program list;
- empty snapshot contract when the authenticated user has no assigned programs;
- program/workout/workout-exercise/user-workout/set/exercise structure;
- DB cardinality comparison;
- no cross-user user-workout/set leakage;
- `programWorkoutId` separation when the same workout template is used by multiple programs;
- `exerciseKey` contract;
- exercise de-duplication;
- `imageFiles` array contract;
- generated timestamp validation.

### Detail
- canonical header fields against PostgreSQL;
- workout prescription count and IDs;
- concrete set count and IDs;
- exercise de-duplication and `exerciseKey`;
- exact 6-exercise / 16-set acceptance fixture, if present;
- missing resource;
- foreign-user ownership and data non-disclosure.

### State
- SCHEDULED -> IN_PROGRESS;
- actual reps/weight/notes persistence;
- target/prescription fields remain unchanged;
- canonical response after write;
- idempotent retry;
- IN_PROGRESS -> COMPLETED;
- `completedAt` persistence;
- program progress response;
- all supplied sets persisted;
- foreign set rejection;
- transaction rollback verification;
- invalid status;
- duplicate set IDs;
- negative actual values;
- foreign user update rejection.

### Authentication
- all three endpoints reject requests without credentials;
- malformed credentials are rejected.

The specification's expired-token acceptance criterion is intentionally not faked with a malformed token. To test that criterion strictly, provide a genuinely expired access token from the test environment/auth fixture and add it as a dedicated fixture rather than pretending a malformed token is equivalent.

## Required environment

The suite uses the existing E2E helper configuration:

- `E2E_API_URL`
- `E2E_USER_USERNAME`
- `E2E_USER_PASSWORD`
- `E2E_COACH_USERNAME`
- `E2E_COACH_PASSWORD`
- `E2E_DB_HOST`
- `E2E_DB_PORT`
- `E2E_DB_NAME`
- `E2E_DB_USER`
- `E2E_DB_PASSWORD`
- `E2E_DB_SSL`
- `E2E_LANGUAGE`

## Run

From the existing E2E project:

```bash
npx playwright test tests/MOBILE/API/mobile-v1-comprehensive.spec.ts --headed
```

Headless:

```bash
npx playwright test tests/MOBILE/API/mobile-v1-comprehensive.spec.ts
```

Do not modify the assertions to make a failing backend behavior pass. Fix the backend or fixture/API contract instead.
