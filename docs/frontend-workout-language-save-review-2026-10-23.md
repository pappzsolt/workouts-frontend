# Workout language-save review — 2026-10-23

## P1 — Workout text can be saved under the wrong language after a language switch

Fixed. The following descriptions record the original defect. This reveals an incomplete aspect of the previous workout language reload/draft fix, rather than a failure of stale-response cancellation.

Locations:
- CoachWorkoutEditComponent.saveWorkout: saves without checking which language the current form belongs to or whether that language finished loading.
- CoachWorkoutEditComponent.loadWorkout(true): merges old-language text drafts into new-language server data without tracking draft language.
- CoachWorkoutsService.updateWorkout: chooses the request's language parameter from the current global UI language.

Two independently reproduced paths:
1. Load Hungarian workout text, switch to English and click Save while the English request is pending. The actual frontend service emits PUT with language=en and body.name='Magyar név'. Cancellation of the old load does not prevent this, because the old form remains visible and valid, with no loading guard on save.
2. Edit a Hungarian name to 'Magyar piszkozat', switch to English, wait for the English response. Draft preservation merges the Hungarian draft over 'English name'. Save emits language=en and body.name='Magyar piszkozat'. A loading-only guard would not fix this path.

The backend WorkoutWriteOperations passes the requested languageCode to repository update operations. The request therefore selects the English translation, regardless of the text's origin.

Root-cause fix direction: associate editable text and its drafts with a workout ID and language, keep drafts separate by language (or require explicit save/discard before switching), and allow saving only a form successfully loaded for its own language. Request cancellation alone or disabling Save only during loading is insufficient.

Validation: two temporary FirefoxHeadless tests used the real CoachWorkoutsService and Angular HttpTestingController, asserting the actual outgoing PUT language and text for both paths. Both diagnostic tests reproduced the defect. No real HTTP request or backend write occurred. Temporary spec removed; copy /tmp/frontend-workout-language-save-review-diagnostics.spec.ts; log /tmp/frontend-workout-language-save-review.log. Application code unchanged.

## Implemented root-cause fix

- Form state has an explicit workout/language identity. Localized text drafts are stored by that identity, rather than merged into a different language. Nonlocalized edits are retained separately per workout.
- Switching to English displays English text after a successful load; returning to Hungarian restores its own draft. Switching back to English restores the English draft independently.
- Save and editable workout inputs are disabled while loading or after a failed load. The save handler independently enforces readiness and matching workout/language identity.
- Load and update services accept an explicit language, captured from the form context; old save responses and delayed navigation do not affect a different language's form.
- Four new HTTP regression cases cover pending load, failed load, English save after successful load, and Hungarian/English draft round trips. The earlier language-reload regression now checks returning to the original language to restore its draft.
- Full FirefoxHeadless suite: 256/256 passed. Production build passed. Built translation checks: 4/4 passed. git diff --check passed.
