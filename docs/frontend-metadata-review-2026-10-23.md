# Program metadata review — 2026-10-23

## P2 — Program metadata edits made during saving are discarded

Fixed. Original defect location: src/app/components/coach/coach-program-editor/coach-program-editor.component.ts:197 (unconditional form replacement in loadProgram) and saveDetails success callback.

Reproduction:
1. Open an existing program and submit its name/description.
2. While the save is pending, edit the name or description again. The inputs remain editable; only the save button is disabled.
3. Let the save finish and the subsequent program reload return the submitted values.

Actual: form resets to the submitted values and discards the later edits without confirmation. The server received only the earlier values. The same reset can occur for edits made while the follow-up reload is pending.

The previous exercise-draft fix in loadProgram(..., true) preserves row drafts and an empty-day workout draft, but unconditionally rebuilds the program metadata form. This finding concerns the program metadata itself, not exercise rows.

Recommended fix: track the metadata values actually submitted and preserve fields that have changed since submission, including changes made during the reload; alternatively prevent editing throughout save and reload.

Validation: one temporary FirefoxHeadless diagnostic test reproduced the incorrect behavior with an explicit pending save and successful follow-up load. Its passing assertions confirm the defect, not correct behavior. Temporary source test removed; copy at /tmp/frontend-metadata-review-diagnostics.spec.ts; log /tmp/frontend-metadata-review.log. Application code unchanged.

## Implemented fix

saveDetails captures the raw submitted form before normalizing the request. The follow-up load compares the current form with that snapshot when its response arrives, and preserves changed fields over the server values. Thus both edits made during saving and edits made during reloading survive. The server-backed program model still represents the saved values.

Two permanent regression tests in program-metadata-save.spec.ts cover both timing cases for name and description. Full FirefoxHeadless suite: 244/244 passed. Production build passed; built translation checks: 4/4 passed.
