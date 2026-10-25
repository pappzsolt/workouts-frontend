# Saját készítésű programok

A felhasználói dashboard „Saját készítésű programok” kártyája a
`/user/personal-programs` oldalra vezet. A meglévő programlistáról is elérhető
az új lista és az új program létrehozása. A coach felületek változatlanok.

## Működés

- Piszkozatok létrehozása, teljes szerkesztése, mentése és törlése.
- Programadatok: név, leírás, időtartam, opcionális kezdőnap és nehézség.
- Edzésnapok sorszámmal; a kimaradó sorszámok pihenőnapokat jelentenek.
- Gyakorlatok választása a meglévő, kereshető és szűrhető gyakorlatválasztóval.
- Sorozat, ismétlés, pihenőidő, megjegyzés és gyakorlatsorrend szerkesztése.
- Indítás csak mentett, legalább egy edzést és edzésenként egy gyakorlatot
  tartalmazó programnál, megerősítéssel.
- Indítás után a program zárolt; a megszokott edzésfelületre lehet továbblépni.
- Mentett programból új, szerkeszthető másolat készíthető, eredmények nélkül.
- A nem mentett változásokat routeres megerősítés és böngészős kilépésvédelem óvja.
- Mentési hibánál az űrlap megmarad, a backend üzenete látszik, a művelet újrapróbálható.
- Nyelvváltáskor a feliratok és gyakorlatnevek frissülnek; a beírt programadatok megmaradnak.

## Integráció és közös megoldások

A `PersonalProgramService` az `API_ENDPOINTS.personalPrograms` alatti
`/api/me/personal-programs` API-t használja. Tulajdonosazonosítót nem küld.
A meglévő auth interceptor és a user route szerepkörvédelme érvényes.
A backend `057-personal-programs` Liquibase-migrációt tartalmazó verziója szükséges.
Új frontend környezeti változó vagy csomag nem kell.

Standalone Angular komponensek, template-driven űrlapok, RxJS kérések,
`takeUntilDestroyed`, a közös `SHARED_IMPORTS`, mezővalidáció, megerősítő dialógus,
üzenetek, kártyák, fejléc, ikonok és szemantikus Tailwind színek szolgálják ki az oldalt.
Magyar, angol és német szövegek is készültek. A meglévő coach programkészítő API-t
az új felület nem hívja; a gyakorlatkatalógus közös olvasási műveleteit használja.

## Ellenőrzések

A projekt gyökeréből:

```bash
./node_modules/.bin/ng build --configuration production
./node_modules/.bin/ng test --watch=false --browsers=FirefoxHeadless
node --test scripts/i18n.test.cjs scripts/theme.test.cjs
```

Az `e2e` könyvtárból:

```bash
npm run test:personal-programs
```

A böngészős teszt saját helyi Angular szervert indít. Az összes API-kérést
elfogja, éles fiókot vagy adatbázist nem használ. Desktop és mobil Chromiumban
ellenőrzi a teljes programkészítési folyamatot, a nem mentett változások védelmét,
a mentési/betöltési hibák kezelését, a nyelvváltást és a mobilméretet.
A szerver a projekt gyökeréből indul, hogy a Tailwind tartalomkeresése is helyes legyen.

Ellenőrzés eredménye: production build sikeres, 313 unit teszt, 6 fordítási/téma
teszt és 12 böngészős szerződésteszt sikeres. A build a meglévő admin hibajelentés
komponens optional chaining figyelmeztetéseit továbbra is jelzi.
