# Frontend admin review — 2026-10-23

All three findings below are now fixed. Validation: 230/230 FirefoxHeadless tests pass, including three permanent regression tests in src/app/services/admin/admin-review-regression.spec.ts; production build and built-catalog i18n checks pass. Backend response contracts were checked against the local workouts-project repository. Each defect was reproduced by a temporary FirefoxHeadless diagnostic test (3/3 reproduced); these tests asserted the existing incorrect behavior and were removed from application sources after execution. Copy: /tmp/frontend-admin-review-diagnostics.spec.ts; run log: /tmp/frontend-admin-review-tests.log.

## 1. P1 — Member search fails when a result has an assigned coach

Location: src/app/services/admin/member-search.service.ts, mapCoach (line 106).

Search for a user with extraFields.coach_id. The subsequent GET /api/coaches/{id} returns the public CoachLookupDto: id, name, specialization, avatarUrl. The frontend incorrectly requires email, rejects the valid coach response, throws, and errors the whole forkJoin/search. No search results are emitted, even though both HTTP requests succeeded.

The frontend CoachLookupDto interface is stale: its required email/phone/createdAt/uuid fields are absent from the current Java record. Fix the mapping and consumer model to use the public contract rather than requiring private fields.

## 2. P2 — Registration approval coach choices have blank names

Location: src/app/services/admin/user-edit.service.ts:55–60; consumed by RegistrationRequestsComponent constructor.

GET /api/members/coaches returns public CoachLookupDto objects with name. UserEditService types these as MemberResponse and reads usernameOrName, replacing it with an empty string when absent. Registration coach options therefore retain IDs but have blank labels, preventing reliable coach selection.

Diagnostic: response {id:9,name:'Trainer',specialization:null,avatarUrl:null} becomes {id:9,name:''}.

## 3. P2 — Old login audit responses overwrite results after clearing filters

Location: src/app/components/admin-dashboard/operations/login-audit-logs/login-audit-logs.component.ts:81–115; clear button in corresponding HTML remains enabled while loading.

Start a filtered audit request, then click Clear before it completes. Clear resets filters and starts a second request. If that response arrives first and the earlier filtered response arrives later, the old response replaces the current rows and totals while the filters remain empty. A late error can likewise clear a newer successful result. takeUntilDestroyed only cancels on component destruction; there is no per-request cancellation or generation check.

Diagnostic: complete newer request with row 3, then older request with row 2; visible logs incorrectly end at row 2 while username filter is empty.

## Implemented fixes

- Aligned CoachLookupDto and member-search coach presentation with the public backend contract; removed the unavailable coach email field.
- Mapped registration coach choices from the public name field.
- Cancelled the previous audit subscription on every new page/filter request, so stale successes and errors cannot replace current state.
