# Menüpontonkénti felhasználói tesztek – Workouts

A `menu-navigation-real.spec.ts` automatikusan megnyitja a Workoutsot a **valódi böngészőben**,
bejelentkezik a megfelelő szerepkörrel, rákattint a tényleges oldalsó menüre vagy
kezdőlapi kártyára, és ellenőrzi:

1. A pontos útvonalat (nem csak azt, hogy történt navigáció).
2. A megfelelő Angular képernyő és címsor megjelenését.
3. A betöltés befejeződését.
4. A mobilmenü lezárását navigáció után.
5. Hogy a puszta navigáció nem hajt végre üzletiadat-módosító HTTP-kérést.

A tesztek **asztali és Pixel 7 mobilnézetben** is futnak, valódi belépéssel és
valódi API-val. A tesztek **nem interceptelik és nem hamisítják** az API-válaszokat.

## Futtatás

Előfeltételek: az `e2e/README_MENU_LIVE_API.md` szerint elérhető **izolált teszt PostgreSQL**,
a frontend melletti `workouts-project` backend forrás, Java és a telepített tesztböngészők.
**Éles adatbázison ne futtasd**: a tesztkörnyezet ideiglenes adatbázisokat hoz létre/töröl.

```bash
cd /Users/pappzs/works/develop/workouts-frontend/e2e

# Tesztek felsorolása backend indítása nélkül
npm run test:menu -- --list

# Egy szerepkör összes menüpontja, asztali böngészőben
IT_POSTGRES_URL=jdbc:postgresql://127.0.0.1:5432/postgres \
IT_POSTGRES_USER="$USER" \
npm run test:menu -- --project=desktop --grep '@menu-coach'

# Egyetlen menüpont szimulációja
IT_POSTGRES_URL=jdbc:postgresql://127.0.0.1:5432/postgres \
IT_POSTGRES_USER="$USER" \
npm run test:menu -- --project=desktop --grep 'Edző menü / Programok'

# Mindhárom szerepkör, desktop és mobil
IT_POSTGRES_URL=jdbc:postgresql://127.0.0.1:5432/postgres \
IT_POSTGRES_USER="$USER" \
npm run test:menu
```

A `--list` **csak felfedezi** a teszteket; nem hajt végre böngészős tesztet.
A valódi Live API teszteket külön kell futtatni, és azokhoz backend szükséges.

## Menüpontok

| Szerepkör | Felület | Menüpontok |
|---|---|---|
| Admin | Oldalsó menü | Dashboard, Felhasználók listája, Fióktörlési kérelmek, Regisztrációs kérelmek, Bejelentkezési napló, Hibabejelentések |
| Admin | Kezdőlap | Felhasználók listája, Keresés, Új felhasználó, Felhasználó módosítása, Regisztrációk, Bejelentkezési napló |
| Edző | Oldalsó menü | Áttekintés, Edzői naptár, Ügyfelek, Programok, Edzéstár, Gyakorlattár, Profil, Hibabejelentés, Fiók törlése |
| Sportoló | Oldalsó menü | Dashboard, Profil, Hibabejelentés, Fiók törlése |
| Sportoló | Kezdőlap | Edzéseim, Programjaim, Önálló edzéseim, Gyakorlattár, Saját készítésű programok, Elvégzett programok, Program statisztika, Edzéssablonjaim |
| Mindhárom | Oldalsó menü | Kijelentkezés |

Minden sor külön Playwright-teszt: ha egyetlen menüpont hibás, a többi független teszt lefuthat.
A `--grep '@menu-admin'`, `--grep '@menu-coach'`, `--grep '@menu-user'`
és `--grep '@menu-auth'` címkékkel lehet szerepkörönként szűrni.

## Tényleges felhasználói műveletek, mentéssel és visszaolvasással

A menüpont tesztek **navigációs / képernyőbetöltési tesztek**, nem helyettesítik a
mély üzletifolyamat-teszteket. A projektben ezek már rendelkezésre állnak:

| Felhasználói művelet | Live API teszt |
|---|---|
| Edző – ügyfelek, célsorozatok, programkiosztás és visszavonás | `coach-workspace-real.spec.ts` |
| Edző – edzés létrehozása, szerkesztése, mentése | `workout-real.spec.ts` |
| Edző – gyakorlattár, keresés és törlés | `exercise-real.spec.ts`, `library-template-real.spec.ts` |
| Edző és sportoló – profil, jelszócsere, hibajegy | `profile-report-real.spec.ts` |
| Sportoló – programok, naptár, sorozatok teljesítése és előzmények | `user-journey-real.spec.ts` |
| Sportoló – saját program, önálló edzés, sablonok | `user-journey-real.spec.ts` |
| Sportoló – statisztika, számítások | `statistics-auth-real.spec.ts`, `analytics-boundaries-real.spec.ts` |
| Edző és sportoló – Excel-import / export | `import-export-real.spec.ts`, `import-recovery-real.spec.ts` |
| Párhuzamos edzésmentés | `workout-concurrency-real.spec.ts` |
| Belépés, tokenfrissítés, kijelentkezés | `statistics-auth-real.spec.ts`, `web-session-expiry-real.spec.ts` |

Az admin oldalsó menüinek **navigációs és betöltési** ellenőrzése a mostani
tesztcsomag része; a teljes admin CRUD- és munkafolyamat-lefedettség további
külön vizsgálatot igényel. Az `e2e/tests/ADMIN` és `e2e/ui-contract` már
tartalmaznak több részletes admin-tesztet.

A teljes Live API csomag futtatása:

```bash
npm run test:live-api
```

## Riport

- HTML: `e2e/live-api-report/index.html`
- Hiba esetén képernyőkép és Playwright trace a `live-api-results` alatt
- Tesztfuttatás után `npx playwright show-report live-api-report`

Ezek a tesztek sem jelentik azt, hogy minden üzleti szélső eset bizonyítottan hibamentes.
A következő bővítésnél érdemes minden menüre külön **létrehozás → mentés → újratöltés →
szerkesztés → törlés/archiválás**, valamint hibás API-válasz és kétfelhasználós
versenyhelyzet tesztet készíteni, ahol az adott funkció ezt támogatja.
