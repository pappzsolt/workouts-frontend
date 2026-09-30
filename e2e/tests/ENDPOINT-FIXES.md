# E2E endpoint fixes

Applied fixes against the supplied backend source and latest 113-test Playwright log.

## Changes

- Centralized normal API endpoint paths in `helpers/api-endpoints.ts`.
- Added mobile v1 endpoint constants without changing mobile API paths/behavior.
- Replaced remaining hardcoded normal `/api/...` URLs in tests with `API_ENDPOINTS` constants.
- Corrected `program-workouts` endpoint semantics:
  - PUT by relation id: `/api/program-workouts/{id}`
  - DELETE by relation id: `/api/program-workouts/id/{id}`
  - DELETE all relations of a program: `/api/program-workouts/{programId}`
- Fixed the program-workout cleanup test to use the correct DELETE-by-id endpoint.

## Important

The supplied latest log shows 45 GUI/read-only failures timing out while waiting for the frontend POST login request, plus one program-workout cleanup 403. The cleanup 403 is fixed here.

The 45 login timeouts are not caused by the E2E endpoint map: they occur before the business endpoint tests start. They indicate that the running frontend did not emit the expected `POST /api/auth/login` request (the earlier browser log showed `/auth/login`), or that the frontend/backend currently running are not the same fixed versions. The tests intentionally do not bypass the real login flow.

The supplied backend source confirms the canonical login endpoint is `POST /api/auth/login` and scheduled workouts is `GET /api/user-workout-exercises/scheduled`.
