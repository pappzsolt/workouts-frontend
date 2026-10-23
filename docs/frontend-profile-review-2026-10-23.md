# Profile and admin coach review — 2026-10-23

All three findings below are now fixed. The descriptions document the original defects.

## 1. P1 — A name-only admin coach edit replaces the account role

Location: src/app/services/admin/coach-edit.service.ts:92.

updateCoach always submits roleIds: [3], even though the editor has no role controls and the mapped Coach model discards roles returned by the backend. Editing an account whose current role is ADMIN therefore replaces it with COACH. This concerns a coach account with a different single role; the backend currently permits at most one role per account, so this is not a claim about multiple roles.

Verified against backend MemberCoachCommands.update and MemberRoleOperations.saveRolesForCoach: a non-null roleIds request replaces existing role rows. SQL core schema assigns role 2 to ADMIN and role 3 to COACH. Diagnostic: load a coach with ROLE_ADMIN, change only the name, inspect outgoing request: roleIds is [3]. No live backend writes were performed.

## 2. P2 — An earlier coach profile save clears a newer unsaved password

Location: src/app/components/coach-dashboard/operations/coach-profile/coach-profile.component.ts:136.

Enter password A and save. While the request is pending, replace the password field with B (the input remains enabled). A successful response unconditionally clears profile.password_hash, discarding B even though only A was sent. The user-profile component already compares its current password with the submitted value; the coach profile does not.

Diagnostic: request contains FirstPassword123, input is then set to SecondPassword456; response success clears the input.

## 3. P2 — Coach profile saves can overlap and old responses replace current feedback

Location: same component, saveProfile (line 106); corresponding HTML save button has no pending-request disabling.

Save phone 111, change it to 222, save again while the first request is pending. Both writes are sent independently with no serialization or busy guard. If backend processing order reverses, stale values may win. Even without assuming backend processing order, the frontend's feedback defect is reproduced: second response succeeds, then first request errors; the visible success changes to an error belonging to the older save.

## Validation

Three temporary FirefoxHeadless diagnostic tests assert and reproduce the current incorrect behavior. Their success is evidence of reproduction, not correct product behavior. The diagnostic spec was removed from source after execution and copied to /tmp/frontend-profile-review-diagnostics.spec.ts. Log: /tmp/frontend-profile-review-tests.log. The preceding diagnostics describe the investigation before the fixes.

## Implemented fixes and final verification

- Admin coach updates send roleIds:null. MemberCoachCommands therefore leaves existing role rows unchanged.
- Coach profile success clears the password only if the current field still equals the submitted value.
- Coach profile saves have a saving guard and disable the save button until the request finishes. finalize resets the guard on success, unsuccessful responses, network errors and component destruction; other fields remain editable during saving.
- Six permanent regression tests in src/app/services/admin/coach-profile-regression.spec.ts cover role preservation, password preservation/clearing, overlapping saves, and retries after HTTP/API failures.
- Full FirefoxHeadless suite: 242/242 passed. Production build passed. Built translation checks: 4/4 passed. git diff --check passed.
