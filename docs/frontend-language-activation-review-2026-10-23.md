# Shared language activation review — 2026-10-23

## P1 — Language events fire before the selected language becomes active

Confirmed, not fixed. Location: src/app/services/shared/language.service.ts:setLanguage and getCurrentLanguage.

setLanguage calls translate.use(language), which asynchronously loads an uncached translation catalog, then immediately emits languageSubject.next(language). Consumers respond to language$ by reloading data, but their services get the language from translate.currentLang(). With the installed ngx-translate version, that signal remains on the previous language until catalog loading succeeds. Consequently a selected English event can trigger Hungarian API requests. After catalog loading changes currentLang to English, LanguageService emits no second event, leaving those consumers with Hungarian data under English labels.

Reproduced with the actual installed TranslateService and CoachWorkoutsService, rather than stubs for language behavior. Controlled TranslateLoader delays English catalog loading:
1. Start with Hungarian active.
2. Subscribe to language$ and load a workout when it emits English.
3. Select English. Event sequence is ['hu','en'], but getCurrentLanguage() is still 'hu' and the actual outgoing GET has language=hu.
4. Complete the English catalog. getCurrentLanguage() becomes 'en'; event sequence remains unchanged and no corrective load occurs.

This also exposes a limitation of the earlier workout language tests: they used a BehaviorSubject mock whose getCurrentLanguage immediately matched emitted values. The real shared service does not guarantee that invariant. For the recent language-bound workout form, a load started with Hungarian identity may leave Save blocked after UI language eventually becomes English.

Root-cause fix direction: use a single, coherent language activation lifecycle for events, synchronous getters and request parameters, with explicit handling of failed loads and rapid switches. Do not use a fixed timeout or emit an uncoordinated second reload to conceal the timing error.

Validation: one temporary FirefoxHeadless diagnostic test reproduced the mismatch with real translation and frontend HTTP services. Passing assertions confirmed the defect, not correct behavior. Temporary spec removed from app sources; copy /tmp/frontend-language-activation-review-diagnostics.spec.ts; log /tmp/frontend-language-activation-review.log. No live HTTP requests were made. Application code unchanged.
