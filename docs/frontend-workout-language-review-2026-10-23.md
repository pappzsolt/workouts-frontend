# Workout editor language review — 2026-10-23

Both findings below are fixed in CoachWorkoutEditComponent.

## 1. P2 — Changing language discards unsaved workout metadata

Location: src/app/components/coach-dashboard/operations/coach-workouts/coach-workout-edit/coach-workout-edit.component.ts:151 (language subscription), loadWorkout next callback.

Open an existing workout, change its name or description without saving, then select another language. The language subscription calls loadWorkout, whose response overwrites the bound form model without checking dirty state or asking for confirmation. Diagnostic: an edited name 'Unsaved new name' becomes the server's 'Saved name'.

## 2. P2 — An older language response can replace the current language's workout data

Location: same component, loadWorkout (line 224), loadExercises and loadWorkoutExercises.

Change languages while a previous workout request is pending. Each reload subscribes independently, without cancellation or a request generation check. If the newer request finishes first and the older one later, the older response wins. The wrong language's name/description can then be submitted by saveWorkout. Diagnostic: resolve the latest request with 'English name', then the older request with 'Magyar név'; final model incorrectly contains 'Magyar név'.

## Validation

Three temporary FirefoxHeadless diagnostic tests reproduced these two defects and a conditional response-handling weakness. These assertions confirmed existing incorrect behavior, not correct application behavior. The temporary spec was removed from sources; copy: /tmp/frontend-workout-review-diagnostics.spec.ts, run log: /tmp/frontend-workout-review-tests.log. Application code remains unchanged.

The extra diagnostic fed success:false into exercise assignment: the UI inserted a row and showed success. This is not counted as a confirmed current integration defect because the inspected backend assignment controller returns success:true on its normal HTTP 200 path; rejection response reachability was not established.

## Fix validation

- Language reloads merge current edited fields over the newly loaded server values; untouched fields receive the current translation. Draft tracking also covers edits made before the first server response and during a pending reload.
- Previous workout, exercise catalog, workout exercise and assignment-check subscriptions are cancelled on a new request, and cleaned up on component destruction.
- Added six permanent regression tests in coach-workout-edit.component.spec.ts.
- Final full FirefoxHeadless suite: 236/236 passed. Production build passed. Built-catalog i18n checks: 4/4 passed.
