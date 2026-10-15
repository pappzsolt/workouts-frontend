# Coach Playwright-frissítés – 2026.10.15

A módosítások alapja a 2026.10.15-én csatolt frontend, backend, SQL-dump és e2e-csomag. Az alkalmazás forráskódját és az adatbázis-dumpot a patch nem módosítja. Nincs benne jelszó, .env, SQL-adat, node_modules vagy böngészős nyomkövetés.

## Alkalmazás

A patch útvonalai az **e2e mappán belüliek**. Lépj abba a mappába, amelyben a Playwright `package.json` és `playwright.config.ts` található. Ez a checkoutodtól függően lehet önálló e2e projekt vagy egy frontend repository `e2e` almappája.

```bash
git apply --check ~/Downloads/workouts_e2e_coach_20261015.patch
git apply ~/Downloads/workouts_e2e_coach_20261015.patch
npm ci
npm run typecheck
npx playwright install chromium
```

A meglévő `.env` változatlan marad. A kiegészített `.env.example` csak mintabeállításokat tartalmaz. Branch-, repository- és push-művelet nincs a patchben.

## Két külön tesztcsomag

**Valós API + PostgreSQL:** a meglévő `tests/` tesztek és az új `tests/COACH/WORKSPACE/coach-workspace-live.spec.ts`. Valós böngészős bejelentkezést, valós HTTP-kéréseket és SQL-lekérdezéseket használnak. A saját tesztadatokat API-n hozzák létre és törlik. Az új workspace fixture ellenőrzi, hogy az E2E_USER a megadott coach ügyfele. A történeti adatokat a fixture tulajdonosának API-jával takarítja ki. A takarítás hibája megbuktatja a tesztet.

Indítsd el a megfelelő frontendet és backendet a tesztadatbázissal, és állítsd be a `.env` fájlt. Az új workspace tesztek magyar UI-címkéket használnak; ezekhez `E2E_LANGUAGE=hu` szükséges. Az API URL a backend alapcíme, `/api` végződés nélkül.

```bash
npm test -- --list
npm test -- tests/COACH/WORKSPACE
npm run test:coach
npm test
```

**Elkülönített UI/API-szerződés:** `ui-contract/`, saját `playwright.contract.config.ts` konfigurációval. A tényleges Angular felületet futtatja, a HTTP-válaszokat szabályozott fixture szolgáltatja. Nem tölt `.env` fájlt, nem jelentkezik be valós fiókkal, és nem kapcsolódik valós adatbázishoz. A dátum 2030.04.15., a böngésző időzónája Europe/Budapest. Minden váratlan `/api/` kérés teszthiba. A mockolt token kizárólag ebben a csomagban szerepel; a valós auth-tesztek továbbra is tényleges bejelentkezést használnak.

A friss frontend legyen elindítva, majd:

```bash
npm run test:contract
npm run test:contract -- --project=desktop
npm run test:contract -- --project=mobile
```

Alapértelmezett frontend: `http://127.0.0.1:4200`. Más cím: `E2E_CONTRACT_BASE_URL`. Opcionálisan saját Chromium-futtatható fájl adható meg az `E2E_BROWSER_PATH` változóval; szokásos telepítéshez nem kell.

A két csomag külön eredményt és jelentést ad. Az UI-csomag sikere nem bizonyítja a backend üzleti logikáját, a jogosultságokat vagy az adatbázisos integrációt.

## Lefedettségi térkép

| Terület | Új ellenőrzések | Valós integráció |
| --- | --- | --- |
| Áttekintés | Mai edzések, állapotok, összesítés, figyelmet igénylő/lejárt/inaktív ügyfél, üres és hibás válasz, gyorslinkek, lezárult program | Coach overview végpont szerepkörvédelme |
| Ügyféllista | Név/e-mail/program keresés, kis- és nagybetű, keresés törlése, nincs találat, heti haladás, nulla edzés, megnyitás | Saját ügyfél és fixture-tulajdon ellenőrzése |
| Programlista | Névkeresés, négy rendezés, három állapotszűrő, lapozás, keresés/szűrés után első oldal, megnyitás | Valós új lista → új szerkesztő |
| Programtörlés | Megerősítés, megszakítás, siker, 409 visszajelzés | Történeti sorozat miatti 409 és teljes DB-pillanatkép megőrzése |
| Programadatok | Új program, adatmódosítás, határértékek, nehézség, hiba és ismételt mentés, kettős elküldés | GUI létrehozás/módosítás → PostgreSQL → újratöltés |
| Napok és sablon | Napválasztás, személyes link dátuma, sorozat/ismétlés/pihenő, sorrend és határai, mentetlen előírás védelme | Előírás mentése és sablonátvezetés; az egyéni súly megmarad |
| Edzésnapok | Mozgatás, önálló előfordulás törlése, hetente ismétlés, foglalt nap kihagyása, másik nap, határértékek | Ismétlődő workout előfordulásai külön mozgathatók és törölhetők |
| Edzéstár használata | Névszűrés, közös edzés hozzáadása, önálló másolat napra, több edzés kijelölési sorrendje, kevés szabad nap | Szerkeszthető edzéstári másolat és külön kapcsolatrekordok |
| Program másolása | Dialog, megszakítás, kötelező név, opcionális ügyfél a kérésben, hiba, új szerkesztő | Mély másolat új workout ID-kkal; eredeti DB-pillanatkép megmarad |
| Gyakorlatválasztó | Böngészés, keresés, testrész/eszköz szűrés, lapozás és visszaállítása, részletek, ismételt hozzáadás tiltása, kiválasztás törlése, üres/hibás válasz | A már meglévő exercise CRUD/kapcsolat tesztek megmaradnak |
| Új edzés napra | Név és gyakorlat kötelező; edzés → gyakorlatkapcsolat → napkapcsolat kéréssorrend | Meglévő workout CRUD tesztek, javított új szerkesztőre irányítás |
| Ügyfél edzésterve | Edzés/program/dátum mélylink, edzések közti lépés, programfül, haladás és visszajelzés | Valós user-workout ID-k és saját program |
| Személyes sorozatok | Minden cél- és ténymező, kész állapot, megjegyzés, nullázási jelzők, üres pihenő és 0 különbsége, tizedesvessző, hibás értékek, újratöltés | Minden mező és NULL-jelentés SQL-ellenőrzése |
| Mentetlen változások | Elvetés, maradás, mentés és tovább; fül-/edzés-/programváltás; hibás mentés újrapróbálása | A személyes értékek tényleges mentése |
| Sorozatműveletek | Első sor értékei lefelé, kész sor kihagyása, hozzáadás előtöltéssel, tényadatok nullázása, törlés és megszakítás, hibák | Hozzáadás/törlés SQL-ellenőrzése |
| Ütemezés | Változatlan dátum tiltása, új dátum, hiba | Személyes dátum mentése; sablon napjai változatlanok |
| Kiosztás és visszavonás | Új ügyfél kijelölése, meglévő program kiszűrése, dialog/Escape, megszakítás, hibák, új program rögtön ügyfélnek | GUI visszavonás és újrakiosztás, user_programs/user_workouts ellenőrzése |
| Jogosultság és auth | Új coach route-ok USER-védelme; az auth új edzésszerkesztő mélylinket és F5-öt tesztel | Új overview és coach tools végpontok 403 ellenőrzése |
| Mobil és nyelvek | Az új UI-esetek asztali Chromium és Pixel 7 nézetben; oldal szélessége; angol/német áttekintés | A meglévő mobil/API tesztek megmaradnak |
| Régi felület | Dashboard/program-builder/korábbi programlista megfelelő `/coach/regi` útvonalon | A korábbi API+DB tesztek megmaradnak |

A térkép funkcionális tesztleltár, nem mért kódlefedettségi százalék. A teljes alkalmazás minden lehetséges állapotára vonatkozó 100%-os lefedettséget nem állítja.

## Ellenőrzési eredmények

A végleges futtatási számokat a patch elkészítésekor az alábbi rész tartalmazza. Az adatbázisos teljes csomagot ebben a környezetben nem lehetett lefuttatni: a csatolt konfigurációban megadott privát hálózati PostgreSQL nem érhető el, a 8080-as porton backend nem futott. A SQL-dump sémájával a tesztek oszlopait, az 1-től számolt programnapokat és az opcionális pihenő/egyéni súly jelentését összevetettem. A dumpot nem importáltam meglévő adatbázisba.

### Talált alkalmazáshiba (a patch nem változtatja meg a frontendet)

Mobil Chromium / Pixel 7, 412 CSS-pixel szélesség mellett az ügyfél részletezőjén a sorozattábla betöltése után `document.body.scrollWidth = 898`, `window.innerWidth = 898`, miközben `document.documentElement.clientWidth = 412`. A layout `isMobile()` metódusa `window.innerWidth < 640` alapján dönt, ezért az oldalsáv megjelenik és elfogja a tartalomnak szánt kattintásokat. Reprodukció: `/coach/clients/7?program=1&workout=70` az elkülönített fixture-rel, majd a „Következő edzés” vagy egy sorozat „Kész” jelölőnégyzete. A számok a tesztadatokra vonatkoznak, nem az SQL-dump rögzített azonosítói.

A `responsive client detail: loaded set table stays inside viewport and keeps closed menu hidden` teszt külön, a tényleges méretekkel jelzi ezt a regressziót. Az érintett mobil interakciós tesztek is hibát adnak. Nincs `force: true`, `skip`, `fixme`, elrejtett menüsáv vagy tesztből módosított alkalmazás-CSS. Ez a hiba alkalmazáskód-javítást igényel, nem a teszt elvárásának lazítását.

### Végleges ellenőrzés

| Ellenőrzés | Eredmény |
| --- | --- |
| `npm run typecheck` | Sikeres, a valós és az elkülönített tesztekre is |
| Valós suite `playwright test --list` | 179 teszt, 87 fájl; sikeres betöltés, nem teljes futtatás |
| Új valós workspace suite | 13 eset; API + PostgreSQL elérhetősége híján nem futtatva |
| Elkülönített suite asztali Chromium | 89 sikeres, 1 hibás |
| Elkülönített suite Pixel 7 / mobil Chromium | 68 sikeres, 22 hibás |
| Elkülönített suite összesen | 180 futtatott eset; 157 sikeres, 23 hibás; 0 kihagyott, 0 újrapróbálás |
| Hibák oka | 2 oldal-szélességi regresszió + 21 mobil interakció, amelyet a menüsáv blokkol |

Az asztali regresszió mért értékei: `clientWidth = 1280`, `body.scrollWidth = 1470`, `innerWidth = 1280`. Az eredmények a csatolt Angular-forrás helyi fejlesztői buildjére vonatkoznak, Chromium 153 böngészővel. Az elkülönített HTTP fixture nem bizonyít backend- vagy adatbázis-helyességet.

A meglévő suite 179 esete közül a korábbi eseteket is csak betöltéssel és TypeScript-ellenőrzéssel lehetett ellenőrizni. A régi route-javítások valós backenddel végzett futtatása a saját tesztkörnyezetben szükséges.
