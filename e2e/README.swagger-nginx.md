# Swagger + Workouts NGINX Playwright E2E

Külön konfiguráció: **nem futtatja** az általános `global-setup.ts` adatbázis-előkészítést, nem változtat üzleti adatot.
A belépési folyamat Cloudflare Access e-mailes egyszer használatos kód → Swagger ADMIN HTTP Basic.
A kód beírása **kézzel történik**, nem olvasunk e-mailt. A Basic Authhoz a megadott ADMIN tesztfiókot használjuk.

A frontend repositoryban:

```bash
cd e2e
read -r 'SWAGGER_ADMIN_USER?Swagger ADMIN user: '
read -rs 'SWAGGER_ADMIN_PASSWORD?Swagger ADMIN password: '
echo
export SWAGGER_ADMIN_USER SWAGGER_ADMIN_PASSWORD
node scripts/swagger-cloudflare-login.cjs
npx playwright test -c playwright.nginx.config.ts --headed --reporter=list
unset SWAGGER_ADMIN_USER SWAGGER_ADMIN_PASSWORD
```

Ha a Cloudflare session lejár, futtasd újra a `node scripts/swagger-cloudflare-login.cjs` parancsot.
Az `e2e/.auth/cloudflare-swagger.json` munkamenet-cookie-kat tartalmaz, **ne töltsd fel és ne oszd meg**. Git figyelmen kívül hagyja.
Az anonim teszt külön üres sessiont használ, és ellenőrzi, hogy 401/403 vagy **Cloudflare Accessre mutató 302/303/307/308** érkezik. Más redirect sikertelen teszt.

Csak nyilvános, névtelen tesztekhez ADMIN-adatok nélkül is indítható a `npx playwright test -c playwright.nginx.config.ts`, ilyenkor az authentikált teszteket kihagyja.
A tesztek nem kerülik meg a Cloudflare Access-t és nem végzik el helyetted a második Swagger ADMIN belépést.
