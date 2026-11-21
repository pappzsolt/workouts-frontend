# Workouts frontend: Angular 19 → 21 migration

This document describes **next steps**, not a completed version upgrade. It accompanies
an Angular 19-compatible change to `app.config.ts` that explicitly preserves Zone.js
change detection. The application and unit tests currently rely on Zone.js.

## Audited starting state (uploaded ZIP dated 2026-11-21)

- Angular core 19.2.15, CLI 19.2.18, Material/CDK 19.2.19.
- TypeScript 5.7.3 and Zone.js 0.15.1 in `package-lock.json`.
- Angular build runs on Node 22 in GitLab CI.
- Existing `frontend-playwright` GitLab test job runs mocked `@ci-workouts`
  tests; no additional CI/CD integration is needed.
- `@ngx-translate/core` 18 and `@lucide/angular` 1.47 have Angular peer ranges
  that do not themselves forbid Angular 21, but runtime behavior still needs testing.

## Safe rollout

1. Start with a **clean `master`**. Fetch `origin/master` and `gitlab/master`;
   confirm all three commits match. If not, stop and reconcile without reset/force.
2. Create `backup/master-before-angular21-<timestamp>` from that exact commit;
   push and verify it exists on both `origin` and `gitlab`. Do this **before**
   applying any migration changes.
3. Apply the preparatory patch; run:

   ```sh
   node scripts/angular-upgrade-preflight.cjs
   ```

4. Commit the preparatory patch locally. Angular migrations require a clean
   working tree. Never use `--force` or `--legacy-peer-deps` to hide conflicts.
5. Using Node 22.12 or later (22.x) and working npm network access, migrate
   **one major version at a time**, using the official CLI migrations:

   ```sh
   npx ng update @angular/core@20 @angular/cli@20
   npx ng update @angular/material@20 --allow-dirty
   ```

   `--allow-dirty` on the *second* command is only for the preceding CLI-generated
   changes; review all changes. If migration fails, stop and diagnose. Re-run
   `npm ci` and validation. Commit a successful 20.x checkpoint locally before
   the next hop.

6. After the 20.x checkpoint is clean, update to 21:

   ```sh
   npx ng update @angular/core@21 @angular/cli@21
   npx ng update @angular/material@21 --allow-dirty
   ```

   Keep `provideZoneChangeDetection()`, `zone.js` polyfills, and the existing
   Jasmine/Karma test runner. Do **not** switch to zoneless or Vitest implicitly.
   Angular 21 requires TypeScript >=5.9 and <6.0. Its update schematics should
   update toolchain/lockfile metadata; inspect the results.

7. Validate at *both* major-version checkpoints:

   ```sh
   npm ci
   node scripts/angular-upgrade-preflight.cjs
   npm run test:i18n
   npm run test:theme
   npm run test:landing
   npm run test:seo
   npx ng test --watch=false
   npx ng build --configuration production
   (cd e2e && npm ci && npm run test:contract:ci)
   ```

   For the Playwright suite, ensure Chromium is installed (`npx playwright install chromium`
   from `e2e/`). Review migrations and Angular Material visual behavior manually,
   including coach program editing, user calendar, individual target weights,
   assignment revocation, and workout completion.
8. **Only after successful verification**, commit the final 21.x changes on
   `master`, push to `gitlab` and `origin` (avoid duplicated pushes if `origin`
   has multiple push URLs), and confirm both remote hashes. Check the GitLab
   pipeline result as a separate step.

## Hard stops

- Dependency resolution or `package-lock.json` mismatch.
- Test/build failures, failing mocked Playwright contracts, visual regressions.
- Any changed API contract or business rule.
- Unverified remote backup, dirty branch, or diverged `master` commits.

Official references:
- https://angular.dev/reference/versions
- https://angular.dev/reference/releases
- https://angular.dev/cli/update
- https://angular.dev/guide/zoneless
