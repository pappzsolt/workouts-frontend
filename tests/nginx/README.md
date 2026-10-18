# Workouts NGINX / Swagger regressziós és biztonsági tesztek

A tesztek Node.js beépített `node:test` rendszerével működnek (Node 20+). Nincs új npm-függőség. Nem módosítanak szerveroldali adatot: kizárólag GET-kéréseket használnak.

## Futtatás a frontend repository gyökerében

```bash
node --test tests/nginx/workouts-nginx.test.cjs
```

Alapértelmezett cél: `https://workouts.hevexora.com`; az NGINX-konfiguráció helye: `nginx.runtime.conf`.

Az ADMIN jogosultságú Swagger működésének teszteléséhez (nem szükséges az anonim/biztonsági vizsgálatokhoz):

```bash
read -r 'SWAGGER_ADMIN_USER?Swagger admin felhasználónév: '
read -rs 'SWAGGER_ADMIN_PASSWORD?Swagger admin jelszó: '
echo
export SWAGGER_ADMIN_USER SWAGGER_ADMIN_PASSWORD
node --test tests/nginx/workouts-nginx.test.cjs
unset SWAGGER_ADMIN_USER SWAGGER_ADMIN_PASSWORD
```

Az alaptesztek ADMIN-adatok nélkül is lefutnak, az ADMIN-hoz kötött ellenőrzéseket kihagyják (SKIP). Ezeket a teszteket **valódi ADMIN jogosultságú tesztfiókkal** futtasd, különben helyesen FAIL eredményt adnak. A jelszó nem kerül a kódba és nem íródik ki a teszteredménybe.

Csak helyi konfiguráció ellenőrzése (nincs hálózati kérés):

```bash
NGINX_SKIP_LIVE=1 node --test tests/nginx/workouts-nginx.test.cjs
```

Másik tesztkörnyezet választása:

```bash
NGINX_BASE_URL=https://teszt-pelda.hu node --test tests/nginx/workouts-nginx.test.cjs
```

## Lefedettség

- Konfiguráció: Swagger `^~` prioritás, backend reverse proxy, kétszintű Swagger, API és OpenAPI, Angular SPA fallback, hibás statikus URL 404, HTTPS redirect, CSP/HSTS/X-Frame-Options/nosniff, Cloudflare IP feldolgozás.
- Külső működés: frontend gyökér és `/login`, hiányzó JavaScript 404, HTTP→HTTPS átirányítás.
- Biztonság: Swagger/OpenAPI névtelen hozzáférés tiltása; hibás Basic hitelesítés tiltása; biztonsági válaszfejlécek és globális CORS tiltás.
- ADMIN bejelentkezéssel: Swagger standard és kétszintű oldal, JavaScript/CSS MIME-típusok, OpenAPI JSON és nem üres `paths`.

## Fontos korlátok

- A HTTP-teszt nem tudja bizonyítani, hogy a Swagger a böngészőben teljesen kirenderel; ehhez külön Playwright böngészős teszt vagy manuális ellenőrzés szükséges.
- A teszt nem végez aktív támadást, sérülékenységszkennelést vagy autentikációs brute force-ot.
- A hálózati ellenőrzések eredményét befolyásolhatja Cloudflare, az elérhetőség és a helyi proxy/TLS-konfiguráció. A HTTP→HTTPS átirányítás az ismert publikus hostra történik.
- Az NGINX-konfiguráció szintaktikai ellenőrzéséhez a szerveren külön `nginx -t` kell.
