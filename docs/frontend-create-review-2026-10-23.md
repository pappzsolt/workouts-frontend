# Create-form review — 2026-10-23

Both defects below are fixed. Descriptions record their original behavior.

## 1. P2 — Admin user creation offers an unsupported multiple-role selection

Locations: src/app/components/admin-dashboard/operations/user-new/user-new.component.ts:onRoleSelected/onSubmit; role selection badges in its HTML.

Select USER, then ADMIN in the new-user role picker. onRoleSelected appends distinct roles, the UI shows removable badges for both, and onSubmit accepts any nonempty role list. The outgoing payload contains roleIds:[1,2]. Backend MemberUserCommands invokes MemberRoleOperations.saveRolesForUser, whose validateRoleIds rejects lists longer than one with 'Egy fióknak legfeljebb egy szerepköre lehet.'. The form therefore offers and submits a state the current backend cannot create. The shared role picker can remain reusable; the parent needs to enforce the supported single selection.

Diagnostic: public selection handlers produce two selected roles and submission sends both IDs. Backend restriction verified in local source; no live user creation was attempted.

## 2. P2 — Successful exercise creation discards newer form edits

Locations: src/app/components/coach-dashboard/operations/coach-exercises/coach-exercise-new/new-exercise.component.ts:addExercise success callback; corresponding HTML only disables the submit button while saving.

Fill a new exercise and save. While the request is pending, edit the name/description (inputs remain enabled). The successful response unconditionally replaces the entire form with createEmptyExercise(), discarding the newer unsaved values. In the fallback success message it also uses this.newExercise.name at response time rather than the submitted payload name, so it can claim the newer name was created even though the request contained the older name.

Diagnostic: submitted name 'Submitted exercise'; while pending change to 'New unsaved exercise'; success yields an empty form and messageParams.name='New unsaved exercise'.

Root-cause fix direction: define a creation transaction boundary by locking the form while creating, or track submitted form state and preserve later edits. Construct success message parameters from submitted values.

## Validation

Two temporary FirefoxHeadless diagnostic tests assert and reproduce the existing incorrect behavior. Their passing assertions are evidence of reproduction, not correct product behavior. Temporary source spec removed after execution. Copy: /tmp/frontend-create-review-diagnostics.spec.ts; log: /tmp/frontend-create-review.log. Application code unchanged.

## Implemented fixes and final validation

- Selecting an admin user role replaces the prior selection; submission requires exactly one role. The shared picker remains reusable and role removal still works.
- New exercise creation snapshots the submitted form and builds success message parameters from the submitted name. On success only fields unchanged since submission reset to defaults; newer edits survive. Duplicate creation calls are blocked while saving; unsuccessful responses retain the current form and permit retry.
- Six permanent regression tests in src/app/services/admin/create-form-regression.spec.ts cover role replacement and invalid multiple-role submission, draft preservation, ordinary reset, duplicate-save prevention, and retry after failure.
- Full FirefoxHeadless suite: 262/262 passed. Production build passed. Built translation checks: 4/4 passed. git diff --check passed.
