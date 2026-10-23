# Program editor action review — 2026-10-23

Both defects below are fixed; descriptions record the original behavior. Both are in src/app/components/coach/coach-program-editor/coach-program-editor.component.ts.

## 1. P2 — Repeating or adding a workout to another day silently drops prescription drafts

Locations: repeatWeekly, addToAnotherDay, shared run completion callback.

Change a workout exercise's sets from 3 to 5 without saving its prescription. Use Repeat weekly, or add the workout to another empty day. Those actions do not check changedCount or request a discard confirmation. They call run, which reloads the program with draft preservation disabled. Even though the selected day stays unchanged, the exercise row resets to 3 and changedCount becomes zero.

This differs from the previously fixed day-click discard protection and metadata-save preservation: neither selectDay's confirmation nor loadProgram(..., true) is used by these actions.

Recommended fix: preserve existing prescription drafts across these structural reloads, or require save/discard before performing the action. Include the error-reload path, which can also discard drafts.

## 2. P2 — Prescription save discards edits made while saving

Locations: savePrescriptions and shared run completion callback.

Set sets to 5 and save prescriptions. While the request is pending, edit the row to 7 (the row inputs remain enabled). The request contains 5. After the save succeeds, run reloads the program and rebuilds rows from the server's 5, dropping the newer 7 without confirmation. The same risk applies to repetitions and restSeconds.

Recommended fix: snapshot submitted values per row; on reload keep fields changed after submission while advancing original values to the successfully persisted values. Preserving all dirty rows without updating original values is insufficient because it would also leave successfully saved rows marked dirty.

## Validation

Three temporary FirefoxHeadless tests reproduced the existing incorrect behavior: weekly repeat, add to another day, and edit during prescription save. All three diagnostic assertions passed. The spec asserted the defects, not correct product behavior; removed from app sources after execution. Copy: /tmp/frontend-program-action-review-diagnostics.spec.ts; log: /tmp/frontend-program-action-review.log. Application code unchanged.

## Implemented fixes and verification

- Weekly repeat and adding a workout to another day preserve prescription drafts across success and error reloads.
- Draft restoration merges only changed prescription fields, leaving untouched fields at their current server values.
- Prescription requests capture submitted values. Each successful response advances that row's original snapshot to the submitted values, while the editable values remain untouched. The following reload preserves any newer edits, including edits made during reloading or a change back to the value that preceded saving.
- Eight permanent regression tests in program-action-drafts.spec.ts cover both structural actions, errors, clean successful saves, and newer sets/repetitions/rest edits.
- Full FirefoxHeadless suite: 252/252 passed. Production build passed. Built translation checks: 4/4 passed. git diff --check passed.
