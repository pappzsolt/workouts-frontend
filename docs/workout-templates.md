# Saját edzéssablonok és kedvencek

Az önálló saját edzés szerkesztőjében a **Mentés edzéssablonként** gombbal elmenthető a már mentett edzés terve. Ez piszkozatnál és elindított önálló edzésnél is működik; az el nem mentett szerkesztést előbb menteni kell. Üres edzésből nem készíthető sablon.

A **Saját edzéssablonok** oldal (`/user/workout-templates`, a felületen Edzéssablonjaim) elérhető a dashboardról, a saját programok listájából és az önálló edzés szerkesztőjéből. A név szerint kereshető sablonok kedvencnek jelölhetők; a kedvencek előre kerülnek, és külön szűrhetők. A kedvencjelölést az adatbázis tárolja.

Az **Új edzésalkalom** külön, szerkeszthető önálló edzéspiszkozatot készít, és megnyitja a megszokott szerkesztőt. Kezdődátuma nincs, indítása külön művelet. A teljesítési eredményeket, sorozattörténetet és időzítőket nem másolja. A sablon és a korábbi edzések változatlanok. A sablon törlése megerősítést kér, és nem törli sem a forrást, sem a belőle létrehozott alkalmakat.

## Tárolás és kompatibilitás

A `060-personal-workout-templates` Liquibase changeset új `personal_workout_templates` táblát hoz létre. A programtervet önálló JSONB-pillanatképként tárolja, felhasználói tulajdonossal és kedvencjelöléssel. Régi táblát vagy changesetet nem módosít, meglévő edzést nem alakít át. JDBC-t használ, új jOOQ-generálás nem szükséges.

A forrásként használt piszkozat törlése csak a forráshivatkozást nullázza; a sablon megmarad. Ugyanabból a forrásból ismételt mentés a meglévő sablon tervét frissíti, az azonosítót és a kedvencjelölést megőrzi. A kezdődátum és a forrás verziója nem kerül az új alkalomba. Új alkalom készítésekor a meglévő sajátedzés-szolgáltatás újra ellenőrzi a katalógusbeli gyakorlatokat és a méretkorlátokat. Hiányzó gyakorlat vagy más hiba esetén az egész művelet visszagörgetődik.

## API

Web: `/api/me/workout-templates` (Swagger: **Saját edzéssablonok**).
Mobil: `/api/mobile/v1/workout-templates` (Swagger: **Mobile API v1**).
Mindkettő USER bearer tokent igényel, kizárólag a bejelentkezett felhasználó adatait kezeli.

| Metódus | Relatív útvonal | Kérés / válasz `ApiResponse.data` |
|---|---|---|
| GET | üres | `WorkoutTemplate[]`, kedvencek elöl |
| POST | üres | `{sourceProgramId, expectedVersion}` → mentett `WorkoutTemplate` |
| PUT | `/{id}/favorite` | `{favorite: true/false}` → friss `WorkoutTemplate` |
| POST | `/{id}/use` | új `PersonalProgramRepository.Detail`, önálló edzéspiszkozat |
| DELETE | `/{id}` | törölt sablon azonosítója |

A `WorkoutTemplate` mezői: `id`, `sourceProgramId` (nullázható), `favorite`, `createdAt` (időzónás ISO-időbélyeg), `program` (`PersonalProgramRequest`, dátum és expectedVersion nélkül).

Nem saját forrás vagy sablon: 404. Elavult forrásverzió: 409. Normál vagy coach-programból sablonmentés nem engedélyezett; az eddig működő coach-folyamatok és az önálló edzés ismétlése változatlanok.

## Ellenőrzés

Backend: migráció friss és korábbi adatbázison, ismételt migráció, régi coach- és saját adatok megőrzése; tulajdonosvédelem; stale verzió; kedvenc megőrzése ismételt mentésnél; forrástörlést túlélő pillanatkép; eredmények nélküli új alkalom; sablontörlés; hiba utáni tranzakciós rollback; web/mobil aliasok és Swagger-csoportok.

Frontend: sablonmentés feltételei, dupla kattintás elleni védelem, kedvencszűrés és keresés, hibás kedvenc- és alkalommentés, megerősített törlés. Helyi böngészőtesztek mockolt API-val, asztali és mobil nézetben:

```sh
cd e2e
./node_modules/.bin/playwright test -c playwright.workout-templates.config.ts
```
