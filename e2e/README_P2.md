# P2 regression tests

Run from `workouts-frontend/e2e`, with the current frontend/backend and dedicated
test database configured as in the main README:

```sh
npm run test:p2 -- --retries=0
```

These six tests use actual browser sessions, application APIs and PostgreSQL.
They do not replace API responses, force clicks, sleep for a fixed duration,
skip cases conditionally or retry failed tests. The offline case temporarily
disconnects only its own browser context and reconnects it in `finally`.

| Case | Failure it detects |
| --- | --- |
| Real screenshot → report → admin | Lost text/reporter information, wrong report-image association, broken upload/download, image corruption, non-admin data exposure and executable HTML. The screenshot is captured from the actual page; decoded pixel hashes must match after server re-encoding, and the downloaded bytes must match PostgreSQL. The admin page is reloaded and must fetch the persisted image again. |
| Offline save and retry | Lost drafts or a false success after a failed network request. The complete program DB snapshot must stay unchanged while offline. Reconnection sends the same payload once, persists it and survives reload; unrelated sets must stay unchanged. |
| Stale browser editing the same row | Silent overwrite by an editor opened before another save. The stale request must return 409, preserve the local draft and leave the entire saved DB snapshot unchanged. After an explicit reload, a new edit preserves the newer weight. |
| Different rows in two browsers | Overly broad conflict detection that prevents independent edits to separate rows. Both writes must succeed and both browsers must see both results after reload. |
| Partial multi-row save | Resending already committed rows, incorrect completion counts or lost unsaved rows after a later request fails. The first completed row remains committed and clean; the conflicting second row remains dirty; retry sends only that second row. |
| Simultaneous API requests | A check-then-write race in conflict detection. Two different updates sharing the same baseline run concurrently: exactly one must return 200 and one 409; both stored fields must belong to the winning request. |

## Production fix exercised by these tests

The coach full-row editor now sends its last observed values as `expected` in the
existing set PUT request. Under the existing transaction/workout lock, the backend
compares the fields the editor is about to overwrite, before changing rest duration,
effort, values or completion. A mismatch returns 409. This is a value-based optimistic
concurrency check; it does not require a new database column or migration.

Older narrow API clients may omit `expected`. A coach editing stale data is still
protected against changes made by those clients, because the check compares current
database values. Clients omitting `expected` do not themselves gain stale-write detection.
Deploy the backend support before the updated frontend.

The browser marks each row clean and updates completion counts only after its own
request succeeds. Failure of a later row does not invalidate an earlier commit.
Local edits made while a request is pending remain dirty.

The first run against the previous implementation deliberately demonstrated three
failures: a stale browser received 200, a stale second row in a batch received 200,
and simultaneous writes both received 200. These tests were kept strict; the
application was fixed rather than weakening the expected results.

## Fixtures and related checks

The cases reuse the isolated account/program fixture from P1, including owner-API
history removal and coach-API template cleanup. Bug reports intentionally survive
account deletion in the product and have no DELETE API, so the report test deletes
only reports owned by its disposable account, then verifies screenshot cascade
cleanup before the account fixture is removed.

The existing desktop/mobile UI-contract tests remain separate from this real-backend
suite. Their request expectations include the new baseline, and their in-memory
fixture does not store request metadata as domain data.

`PasswordResetOutboxTokenCipherTest` now exercises production-length tokens across
fresh cipher instances, independent nonces, a wrong deployment secret, tampered nonce,
ciphertext and authentication tag, malformed encrypted records and real-length legacy
plaintext compatibility. The full email/database chain remains covered by P1.
