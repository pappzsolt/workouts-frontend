# Playwright – hitelesítés és API-biztonság

Új tesztek: `tests/API-SECURITY/security-hardening-web.spec.ts` (17 eset).
A meglévő teszteket nem helyettesíti. Csak `@playwright/test` használatos.

## Forrásból ellenőrzött szabályok

- JWT Bearer + `STATELESS` backend biztonsági lánc.
- Védett API-n anonim vagy érvénytelen JWT: HTTP 401.
- Webes refresh/logout POST: engedélyezett Origin/Referer kötelező; hibás/hiányzó Origin: 403.
- `workouts_refresh` cookie: HttpOnly, SameSite Strict, `/api/auth/web` path; HTTPS környezetben Secure is elvárt.
- A refresh token nem helyettesítheti a Bearer JWT-t.
- A jelszó-visszaállításnál per-email és per-IP rate limiting található.

## Futtatás

Az `e2e/` könyvtárból:

```bash
npx playwright test tests/API-SECURITY/security-hardening-web.spec.ts --headed --reporter=list
```

A cookie teszthez `E2E_USER_USERNAME`, `E2E_USER_PASSWORD` és működő teszt webkörnyezet kell.
Az API alapcíme `E2E_API_URL` (alapérték `http://localhost:8080`), a frontend `E2E_BASE_URL` (alapérték `http://localhost:4200`).
Az `E2E_WEB_ORIGIN` felülírhatja a refresh/logout elvárt Origin értékét, ha a CORS beállítás ettől eltér.

## Rate limiting – kizárólag elkülönített, helyi teszt-backenden

A teszt alapból SKIP, és kizárólag `localhost`/`127.0.0.1`/`::1` API címen indítható. A dedikált, nem létező `example.invalid` emaillel legfeljebb 4 kérés történik, a küszöb eléréséig. **Az IP rate limit más, ugyanarról a tesztkörnyezetről érkező teszteket is befolyásolhatja**, ezért külön környezetben indítsd.

```bash
E2E_RATE_LIMIT_TEST=1 npx playwright test tests/API-SECURITY/security-hardening-web.spec.ts --grep 'rate limiting' --reporter=list
```

Ha a teszt-backend limitkonfigurációját módosítottad, a felső próbaszám `E2E_RATE_LIMIT_MAX_REQUESTS`-sel 2–5 közé állítható. Ez **nem általános DDoS-védelem ellenőrzés**, hanem a meglévő password-reset korlátozó konkrét próbája.

## Korlátok

- A hamis/lejárt JWT-vel végzett tesztek NEM várják ki egy valódi token lejárati idejét; ehhez külön időzített vagy rövid TTL-es integrációs környezet kell.
- A szerepkörös tesztek a repository meglévő `API-SECURITY/authorization.spec.ts` és `AUTH/ROLE-MATRIX` tesztjeiben találhatók; ez az állomány nem másolja őket.
- A JWT/Bearer API-n nem a klasszikus szerveroldali CSRF token az elvárt: a webes cookie-s refresh/logout Origin/Referer védelmét teszteljük.
- Az alkalmazás `Secure` cookie-ja az éles konfigurációtól függ, ezért HTTPS frontend környezetben várjuk el.
- Ezek az ellenőrzések nem végeznek adatot módosító üzleti API-műveleteket, kivéve az elkülönített, opt-in jelszó-visszaállítási rate-limit próbát.
