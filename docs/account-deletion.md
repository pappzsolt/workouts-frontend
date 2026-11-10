# Fióktörlés frontend

Nyilvános útvonal: `/delete-account`. Nem igényel bejelentkezést. Link található a loginoldalon és a felhasználói/edzői menüben. Admin felület: `/admin/account-deletion-requests`, meglévő ADMIN route-védelemmel.

A funkció a backend 062-es account-deletion migrációját és a hozzá tartozó API-kat igényli. A kérelem beküldése nem töröl fiókot: a „Feldolgozás rögzítése” művelet a korábban kézzel elvégzett feldolgozást dokumentálja. Az új „Felhasználó törlése” külön művelet ténylegesen töröl az aktív adatbázisban. Az üzemeltető rendszeresen figyelje a kérelmeket, ellenőrizze a jogosultságot, hajtsa végre a fiók és a kapcsolódó személyes adatok törlését, és küldjön email-visszaigazolást.

## Kötelező éles konfiguráció

`public/assets/account-deletion.json`:

- `appName`: Play-adatlappal egyező appnév; alapérték Workouts.
- `captchaSiteKey`: Google reCAPTCHA **v2** webes nyilvános kulcs.
- `processingTime`: ténylegesen vállalt feldolgozási idő, annak kezdete.
- `retentionPolicy`: pontos megőrzött adatkörök, okok és időtartamok; mentések és kérelmek megőrzése is. Ha nincs kivétel, a valós működés szerint ezt kell leírni.
- `supportEmail`: valós, figyelt cím, opcionális, mert az űrlap önmagában is kapcsolatfelvételi mechanizmus.

A site key és a két tájékoztató szöveg kezdetben üres. A valós üzemeltetési adatok kitöltéséig a beküldés nem aktív. Kitalált email, feldolgozási határidő vagy megőrzési jogalap nincs a konfigurációban. A szövegmezők nyelvfüggetlenek; szükség esetén tartalmazzák a fordításokat is. A JSON a build utáni `assets/account-deletion.json` fájlban is módosítható. Telepítéskor ezt a fájlt és az esetleges CDN-cache-t is kezelni kell.

A reCAPTCHA **secret kizárólag a backendhez tartozik**:

```
ACCOUNT_DELETION_RECAPTCHA_SECRET=<secret>
ACCOUNT_DELETION_RECAPTCHA_HOSTNAMES=workouts.hevexora.com
```

A frontend soha nem kapja meg a secretet. A nyilvános kulcsot és a backenden megadott hostname-ot ugyanahhoz a Google reCAPTCHA v2 widgethez kell beállítani. Nincs Cloudflare CAPTCHA-integráció.

A módosított NGINX CSP átengedi a reCAPTCHA script-, frame- és connect-forrásait. A meglévő SPA-fallback kell a `/delete-account` közvetlen megnyitásához. Ha további reverse proxy/CDN CSP-t is küld, azon is engedélyezni kell a forrásokat. Az alkalmazás meglévő reverse proxy topológiája nem változott.

## API és működés

- `POST /api/public/account-deletion-requests`: email, opcionális message és captchaToken. A kérés nem küld access tokent, és hibája nem indít refresh/logout/átirányítási folyamatot.
- `GET /api/admin/account-deletion-requests?page=0&size=20`: lapozott lista, megmaradó bearer-hitelesítéssel.
- `PATCH /api/admin/account-deletion-requests/{id}/resolution`: COMPLETED vagy REJECTED állapot, kötelező indoklás. A UI külön megerősítést kér a kézi műveletekről.

HTTP 202: a kérelmet rögzítették, nem történt azonnali törlés. HTTP 429: Retry-After tájékoztatás. Hiba után az email és megjegyzés megmarad, de új CAPTCHA szükséges. A nyilvános felület nem mutatja meg, hogy az emailhez tartozik-e fiók. HU/EN/DE feliratok és a meglévő szemantikus színpaletta maradnak használatban.

## Ellenőrzés

```
./node_modules/.bin/ng build --configuration production
./node_modules/.bin/ng test --watch=false --browsers=FirefoxHeadless --include='src/app/services/account-deletion/*.spec.ts' --include='src/app/components/delete-account/*.spec.ts' --include='src/app/components/admin-dashboard/operations/account-deletion-requests/*.spec.ts'
node scripts/check-theme.cjs
node --test scripts/i18n.test.cjs
```

Az e2e könyvtárból, a kész production builddel, külön szerver nélkül:

```
E2E_STATIC_DIST=../dist/workouts-frontend/browser ./node_modules/.bin/playwright test --config=playwright.contract.config.ts account-deletion.spec.ts
```

Az új unit tesztek száma 7; az e2e 4 próbát futtat (sikeres beküldés és 429, asztali/mobil nézet). A CAPTCHA és az API mockolt; a teljes éles folyamatot valódi Google-kulccsal és domainnel is ki kell próbálni.

A weboldal készítése nem publikálja automatikusan a domaint. A Play Console-ba csak a telepített, kitöltött konfigurációval működő publikus oldal URL-je adható meg. A későbbi natív Android appban külön, könnyen megtalálható törléskezdeményezést kell elhelyezni. Google-forrás: https://support.google.com/googleplay/android-developer/answer/13327111?hl=en

## Tényleges felhasználótörlés

A `/admin/users` felhasználólistában és a `/admin/account-deletion-requests` kérelmek mellett külön **Felhasználó törlése** gomb van. A felhasználólistában a fióktípust is megőrizzük, ezért azonos USER/COACH számazonosító esetén is kizárólag a kiválasztott USER érintett. Saját vagy ADMIN fiók nem törölhető. Edzői fiókhoz nincs új törlési művelet.

A megerősítő párbeszédablak előnézetet kér a `POST /api/admin/user-deletions/preview` végponton (`userId` vagy `email`). A törléshez kézzel beírt egyező email és a jogosultságellenőrzés/végleges szándék megerősítése szükséges. A `POST /api/admin/user-deletions` a preview UUID-ját is megkapja; nem kizárólag egy beírt email alapján választ fiókot. A kérelemfelületről indítva a kérelem ID-ját is továbbítja, amit a backend ellenőriz.

Siker után a törölt USER kártyája eltűnik, de más fióktípus azonos számazonosítójú kártyája megmarad. A kérelmek listája frissül. Hiba esetén nincs sikeres törlést állító üzenet, és új megerősítés szükséges. A beküldés alatt az ismételt végrehajtás és a bezárás letiltott.

A backend egy tranzakcióban törli a fiókot és az edzéstörténetet/sorozatokat, személyes programokat/sablonokat, kapcsolódó bejelentéseket és mellékleteket, regisztrációs és hitelesítési adatokat, valamint belépési naplókat. Más felhasználók adatai és közös edzéstervei megmaradnak. A kapcsolódó függő törlési kérelmek lezárulnak, emailjük és szövegük eltávolításra kerül. Automatikus email-értesítés nincs: a felület erre a végrehajtás előtt és után is figyelmeztet. Biztonsági mentések és külső rendszerek az üzemeltetési rend szerint külön kezelendők.

Új böngészős teszt az e2e könyvtárból:

```
E2E_STATIC_DIST=../dist/workouts-frontend/browser ./node_modules/.bin/playwright test --config=playwright.contract.config.ts admin-user-deletion.spec.ts
```

Ez az admin felhasználólistából és a kérelmekből indított törlést is ellenőrzi asztali/mobil nézetben, mockolt API-val. Valódi backend integrációs tesztek ellenőrzik a jogosultságokat, UUID/email megerősítést, adattörlést, régi token elutasítását, mások adatainak megőrzését és a rollbacket.
