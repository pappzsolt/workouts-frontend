# P1 acceptance tests — real backend, database and email

Run from `workouts-frontend/e2e`:

```sh
npm run mailbox
# In a second terminal, with frontend and test backend running:
npm run test:p1 -- --retries=0
```

The five cases cover:

- Assigned program → workout card → exercise detail → edit and complete all three
  sets through the UI → reload → compare actual values, targets, completion and
  the untouched second occurrence in PostgreSQL and the owner's API.
- Exact statistics for two API-created completed workouts: 1280 kg and 1550 kg,
  2830 kg monthly total, 27 repetitions per workout, 0/2 → 1/2 → 2/2 completion,
  weekly change and the best-weight Epley 1RM. Dates and numbers are fixed;
  a fresh account prevents unrelated workout history affecting the result.
- Actual forgot-password form → backend outbox → SMTP email → emailed link →
  reset form → new-password login. Old-password login and token reuse must fail.
- A real emailed token with an expired validity period must fail and leave the
  password unchanged; the original password must still permit login.
- Registration form → pending request in PostgreSQL with no account yet → login
  denied → admin UI selects a coach and approves the exact request → USER account,
  profile and role persisted → real login and session restored after reload.

## Runtime configuration

Use a dedicated test database with the current backend Liquibase migrations,
including `056-password-reset-encrypted-token-capacity`. This fixes a real error:
the 64-character token becomes 131 characters after encryption, exceeding the old
`password_reset_email_outbox.raw_token` varchar(128). The migration expands it to 512.

The normal E2E `.env` credentials for ADMIN and COACH and database access are required.
`E2E_BASE_URL` defaults to `http://localhost:4200`; `E2E_API_URL` defaults to
`http://localhost:8080`. Set the test backend environment to:

```dotenv
MAIL_HOST=127.0.0.1
MAIL_PORT=1025
MAIL_FROM=workouts@example.invalid
MAIL_SMTP_AUTH=false
MAIL_SMTP_STARTTLS=false
FRONTEND_BASE_URL=http://localhost:4200
PASSWORD_RESET_OUTBOX_ENABLED=true
```

`FRONTEND_BASE_URL` must match the frontend origin used by E2E. The tests open the
actual emailed link and fail on a mismatched origin. Allow that origin in backend CORS.
If the backend runs in a container, use a host address reachable from the container
for SMTP instead of its own loopback address, with an appropriately reachable SMTP
receiver. The bundled receiver intentionally binds only to the host's loopback.

The backend `test` Spring profile explicitly disables the password-reset scheduler.
When using it, override with `--app.password-reset.outbox.enabled=true` on the backend
command line. The `dev` profile can use the environment value above.

The mailbox needs no npm dependency, SMTP authentication or external mail service.
It stores at most 200 messages in memory and exposes recipient-filtered HTTP reads.
Stop it when done. Optional E2E settings:

```dotenv
E2E_MAILBOX_URL=http://127.0.0.1:8025
# For npm run mailbox, exported in that terminal:
E2E_SMTP_PORT=1025
E2E_MAILBOX_PORT=8025
```

There are no response intercepts, injected auth tokens, forced clicks, fixed sleep
calls, retries or conditional skips. Missing SMTP/runtime prerequisites fail the tests.

## Deliberate SQL use and cleanup

Business setup uses real application APIs; tested UI writes use the actual forms.
SQL reads verify persisted state. The expiry case moves only its own real token's
`expires_at` into the past instead of waiting 30 minutes; it does not manufacture a
token or bypass the reset endpoint. This controlled precondition is separate from
the successful delivery/reset case.

Every case uses a random `e2e_p1_...` identity. Completed workout history is removed
through the owner's API before coach template deletion. Since no member deletion
API exists, a transaction removes only the exact username/email fixture, associated
reset tokens, outbox records, refresh families and token versions. Registration
requests are also removed by exact identity. Shared E2E accounts/passwords are unchanged.
