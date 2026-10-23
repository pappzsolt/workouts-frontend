# Frontend hibavizsgálat – 2026. október 23.

**Javítási állapot:** az 1–8. pont javítva a felhasználó kérésére. A korábbi program- és kiosztásbetöltések megszakadnak, a nem betöltött program mentése tiltott; az edzéstár HTTP-hibák után is újratölthető. A napváltás védi a mentetlen módosításokat, a sikertelen ügyfélprogram-betöltés törli a korábbi edzésnézetet és újrapróbálható, a regisztrációs lista korábbi lekérései megszakadnak. A regisztráció jóváhagyása és elutasítása ellenőrzi a success jelzőt; a gyakorlat szerkesztője elkülöníti a különböző nyelvek betöltéseit és mentési válaszait; az admin null coachId küldésével törölheti az edző-hozzárendelést. A backend MemberUserCommands kódjában ellenőriztem, hogy a null coachId értéket a felhasználó rekordjába írja. Összesen 40 új regressziós teszt sikeres. A legutóbbi teljes csomag: **205 sikeres, 0 sikertelen**. A négy korábbi bukás oka a fókusz nélküli headless Firefox dokumentum volt: az input.blur() nem váltott ki blur eseményt. A négy teszt most explicit FocusEvent segítségével ellenőrzi a változatlan elvárásokat. A diagnosztika igazolta, hogy a számmező modellértéke helyesen 12.5 volt; a blur-kezelő nem futott le. A production build és a buildbe került fordítások ellenőrzése sikeres. Az alábbi hibaleírások az eredeti átnézés megállapításait rögzítik.

Az átnézés kiterjedt a bejelentkezésre, regisztrációra, útvonalakra és guardokra, HTTP-interceptorokra, az admin-, edzői és felhasználói fő folyamatokra, közös űrlapvezérlőkre, fordításokra, valamint a build és CI beállításaira. Az eredeti átnézéskor az alkalmazás működését nem módosítottam; a később kért javításokat a fenti állapotjelzés tartalmazza. P1: előre veendő működési/adatintegritási hiba; P2: normál prioritású működési hiba; P3: kisebb teljesítmény- vagy ellenőrzési hiba.

## Igazolt működési hibák

1. **P1 – Régi programválasz felülírhatja az új program űrlapját.**
   Hely: `src/app/components/coach/coach-program-editor/coach-program-editor.component.ts:150`.
   A programazonosító változásakor a korábbi kérés nincs megszakítva, és a válasz nem ellenőrzi, hogy még az aktuális programhoz tartozik-e. Ha az 1. program válasza a 2. program után érkezik, az URL és a `programId` a 2. programra mutat, de az űrlap az 1. program adatait tartalmazza. A következő adatmentés így a 2. programot írhatja felül az 1. program adataival.
   Bizonyítás: külön tesztben reprodukálva, fordított válaszsorrenddel. Javítás: programazonosítóhoz kötött `switchMap` vagy kérésverzió-ellenőrzés, a kapcsolódó kiosztási kéréseknél is.

2. **P1 – Az edzéstár egyetlen HTTP-hiba után nem tölt be többé.**
   Hely: `src/app/components/coach-dashboard/operations/coach-workouts/coach-workouts.component.ts:136`.
   A `switchMap` belső HTTP-kérése nem kezeli a hibát; a külső feliratkozás `error` ága után a teljes kérésfolyam lezárul. Az újabb keresés/rendezés/nyelvváltás csak `loading = true` állapotot és egy figyelő nélküli `next()` hívást okoz. Az oldal újranyitásáig nem indul új HTTP-kérés.
   Bizonyítás: külön tesztben reprodukálva. Javítás: a belső kérésben `catchError`, hogy a külső folyamat életben maradjon.

3. **P2 – Napra kattintás figyelmeztetés nélkül eldobja a szerkesztést.**
   Hely: `src/app/components/coach/coach-program-editor/coach-program-editor.component.ts:316`.
   A `selectDay()` minden alkalommal újraépíti a sorokat a mentett adatokból. Egy 3-ról 5-re módosított sorozatszám már az aktuálisan kijelölt napra ismét kattintva is visszaáll 3-ra. A másik napra váltás is eldobja a módosításokat.
   Bizonyítás: külön tesztben reprodukálva. Javítás: azonos napra ne történjen újraépítés; valódi váltáskor mentés/elvetés/maradás választás vagy piszkozatmegőrzés.

4. **P2 – Sikertelen programváltásnál az előző program edzései jelennek meg.**
   Hely: `src/app/components/coach/coach-client-detail/coach-client-detail.component.ts:242`.
   Az új `programId` a kérés előtt beáll, de HTTP-hibánál csak a betöltési jelző és az üzenet változik. Az előző `workouts`, `weeks`, `selectedIndex` és sorozatadatok megmaradnak. A betöltési jelző eltűnése után az újonnan választott program alatt a régi program szerkeszthető edzései látszanak; a dátumkorlátok közben már az új programhoz tartoznak.
   Bizonyítás: külön tesztben reprodukálva. Javítás: hibánál teljes adatállapot-visszaállítás vagy az előző programkiválasztás visszaállítása.

5. **P2 – A sikertelen admin jóváhagyás/elutasítás sikeresként kezelhető.**
   Hely: `src/app/services/admin/registration-requests.service.ts:29` és `:35`.
   Az `approve()` és `reject()` a HTTP 200-as válasz `success` mezőjét nem ellenőrzi. Egy `{success: false, data: null, message: null}` válasz az alapértelmezett sikerüzenetet adja vissza; a komponens meghívja az `afterDecision()` ágat. Ez az alkalmazás által egyébként használt üzleti hibajelzési formátum téves kezelése; HTTP 4xx/5xx esetén a hibakezelés működik.
   Bizonyítás: a jóváhagyás külön tesztben reprodukálva; az elutasítás azonos kódmintát használ. Javítás: `success` ellenőrzése, hiba esetén error csatorna.

6. **P2 – Regisztrációs fülek gyors váltásakor összekeveredhetnek a kérelmek.**
   Hely: `src/app/components/admin-dashboard/operations/registration-requests/registration-requests.component.ts:125`.
   A korábbi lista lekérése nem szakad meg és nincs válaszazonosító-ellenőrzés. Egy későn érkező függőben lévő lista felülírhatja a már kiválasztott jóváhagyott fület, annak számlálójával és lapozásával együtt. Lapozásnál és oldalméretváltásnál ugyanez a kockázat.
   Bizonyítás: külön tesztben reprodukálva. Javítás: állapotot, oldalt és oldalméretet együtt kezelő `switchMap` vagy kérésverzió.

## Kódból következő további hibák

7. **P1 – Gyakorlat szerkesztésekor a késői nyelvi válasz rossz nyelvű mentéshez vezethet.**
   Hely: `src/app/components/coach-dashboard/operations/coach-exercises/coach-exercise-edit/coach-exercise-edit.component.ts:122`, `:138`, `:190`.
   A nyelvváltás azonnal átállítja a `currentLanguage` értékét, és új lekérést indít, de nem állítja le az előzőt. Ha magyar után angolra váltunk, és a magyar válasz érkezik utoljára, magyar mezőértékek maradnak az angol nyelvállapot mellett. A mentés az értékeket az angol nyelvhez küldi el.
   Javítás: nyelvhez kötött megszakítható betöltés; mentés csak az aktuális nyelv sikeres betöltése után; mentetlen szerkesztés védelme.

8. **P2 – Az admin nem tudja törölni a felhasználó edző-hozzárendelését.**
   Hely: `src/app/components/shared/coach/coach-select.component.ts:135` és `src/app/components/admin-dashboard/operations/user-edit/user-edit.component.ts:197`.
   Az üres opció kiválasztásakor a közös vezérlő nem küld `coachSelected` eseményt, és a null/undefined azonosítónál a másik esemény előtt is visszatér. A szülőben ezért a korábbi `selectedUser.coachId` marad meg; mentéskor a régi hozzárendelés kerül vissza.
   Javítás: explicit null kiválasztás továbbítása, nullable eseménytípus és nullable mentési payload a backend szerződése szerint.

9. **P2 – Kiosztási adatok lekérési hibája üres ügyféllistának látszik.**
   Hely: `src/app/components/coach/coach-program-editor/coach-program-editor.component.ts:213`.
   A `forkJoin` bármelyik kérésének hibájára az `error` ág csak `clients = []` értéket állít. A felület ezután azt mutatja, hogy nincs kiosztott vagy további ügyfél; nem jelzi, hogy a lista valójában nem tölthető be. Az előző ügyféladatok is eltűnnek.
   Javítás: külön kiosztásbetöltési hibaállapot és újrapróbálás; a korábbi adatok megőrzése vagy a műveletek letiltása.

10. **P2 – Az új gyakorlat oldala indokolatlan workoutazonosító-hibát jelez.**
    Hely: `src/app/components/coach-dashboard/operations/coach-exercises/coach-exercise-new/new-exercise.component.ts:46` és `src/app/app.routes.ts` (`exercises/new`).
    A közvetlenül megnyitható gyakorlatlétrehozási útvonal nem ad `workoutId` inputot, ezért az oldal megnyitásakor mindig megjelenik a „Workout ID szükséges!” hiba. A tényleges `addExercise()` kérés nem használ ilyen azonosítót.
    Javítás: az önálló gyakorlatlétrehozásból a felesleges követelmény eltávolítása.

11. **P2 – Az ügyféladatlap visszavonása párhuzamosan többször indítható.**
    Hely: `src/app/components/coach/coach-client-detail/coach-client-detail.component.ts:680` és a hozzá tartozó HTML `:341` környéke.
    A programszerkesztő új visszavonásával ellentétben itt nincs folyamatban lévő kérésre vonatkozó védelem vagy letiltott megerősítő gomb. Kétszeri kattintás két DELETE kérést indít. Az első sikerét a második kérés hibája felülírhatja, miközben több újratöltés is elindul.
    Javítás: külön `revoking` állapot, guard és letiltott megerősítés/mégse a kérés idejére.

12. **P3 – A gyakorlatválasztó 300 ms-os keresési késleltetése nem működik.**
    Hely: `src/app/components/coach/exercise-picker/exercise-picker.component.ts:60`.
    Az `of(null).pipe(debounceTime(300))` a forrás azonnali befejeződése miatt rögtön kibocsátja az értéket. A keresés gyakorlatilag minden külön eseményhurokban érkező billentyűleütésre kérést küld.
    Bizonyítás: a projekt RxJS-verziójával az érték szinkron kibocsátását ellenőriztem. Javítás: `timer(300)` vagy a tényleges keresési eseménysoron végzett debounce.

## Ellenőrzési eredmények és korlátok

- Teljes Angular/Karma csomag FirefoxHeadless alatt: **165 tesztből 161 sikeres, 4 sikertelen**, kétszer azonos eredménnyel.
- A két kereshető `AppSelect` tesztben a félbehagyott keresés blur után sem áll vissza a kiválasztott címkére (`missing`/üres érték marad `Anna`/`Anna updated` helyett). A két közös űrlaptesztben a várt `12.5` helyett null marad egy elvárt állapot, és az egyik űrlap validitása is hibás. Ezek önálló kivizsgálást igénylő tesztbukások; a teljes valós felhasználói okot ez az átnézés nem állapította meg. Az összefoglaló nem állít általános hibát minden tizedes mezőre vagy minden böngészőre.
- A GitLab `frontend-build` függ a `frontend-unit-test` sikerétől. Ha a fenti bukások a CI Firefox-verzióján is reprodukálódnak, megállítják a buildet és így a telepítést. Helyi környezet: Node 25.2.1, Firefox 158; CI: Node 22 Alpine és a telepített Firefox.
- Hat célzott, ideiglenes reprodukciós teszt mind igazolta az 1–6. pontban leírt aktuális hibás viselkedést. Ezek diagnosztikai próbák voltak, nem a helyes működést igazoló regressziós tesztek; az alkalmazás forrásai közül eltávolítottam őket.
- `npm run test:i18n`: **3/3 sikeres**.
- `npm run check:theme`: **281 fájl, 0 színhiba**.
- `npm run test:theme`: **2/3 sikeres**. A bukás oka a `scripts/theme.test.cjs:24` sorban a rögzített `result.files > 300` elvárás, miközben a jelenlegi audit 281 fájlt talál. Ez hibás tesztfeltétel, nem igazolt megjelenítési hiba; a teszt már a színhibák ellenőrzése előtt leáll.
- Production Angular build: **sikeres**.
- E2E TypeScript-ellenőrzés: **sikeres**. A backendhez/adatbázishoz kapcsolódó teljes E2E csomagot nem futtattam; a backend működése és az éles rendszer jogosultságai nem képeztek futásidejű ellenőrzést.
- A fordítási tesztek a kulcsok meglétét és a paraméterek egyezését ellenőrzik; nem bizonyítják az éles környezetben kiszolgált JSON azonosságát és a fordítások nyelvi minőségét.

Javasolt sorrend: először az 1., 2. és 7. adatintegritási/működési hibák, utána a 3–6. pontok és a négy tesztbukás, végül a további kezelési és teljesítményhibák. Az átnézés önmagában nem jelent hibamentességi garanciát.
