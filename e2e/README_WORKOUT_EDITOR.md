# Edzés- és programszerkesztő böngészőtesztek

Futtatás a frontend projektből:

```bash
cd e2e
npm run test:workout-editor
npm run typecheck
```

A konfiguráció saját Angular fejlesztői szervert indít a `127.0.0.1:4322`
címen, majd Chromium böngészőben asztali és Pixel 7 mobilnézetben tesztel.
A szerver a futás végén leáll. A futásban nincs automatikus újrapróbálkozás.

A frontend valódi komponensei, űrlapjai, útvonalai és HTTP-kliense futnak.
Az API-válaszokat a meglévő `workspace-fixture.ts` és az új,
nyelvenként külön adatokat tároló `workout-editor-fixture.ts` szabályozza.
A fixture rögzíti a kéréseket, és a tesztek azok teljes JSON-törzsét és nyelvét
is ellenőrzik. Az ismeretlen API-hívások teszthibát okoznak.
Az új fixture a kezeletlen böngészőhibákat is ellenőrzi.

## Új lefedettség

14 új eset, két nézetben összesen 28 böngészős ellenőrzés:

- Magyar–angol és magyar–német váltás: külön név/leírás piszkozatok,
  közös időtartam- és intenzitásmódosítások megőrzése.
- Függő és sikertelen nyelvi betöltés: a régi nyelvű adat nem menthető.
- Betöltés közben megváltoztatott intenzitás megőrzése.
- Gyors nyelvváltás: az előző HTTP-kérés megszakad, a késői válasz
  nem írja felül az aktuális nyelv adatait.
- Üres leírás, törölt vagy nulla időtartam és kikapcsolt jelölőnégyzet
  megőrzése, a teljes mentési törzs ellenőrzésével.
- Függő mentés alatti tiltás, egyetlen mentési kérés.
- Sikertelen mentés utáni újrapróbálás változatlan adatokkal.
- Régi mentési válasz nyelvváltás után nem indíthat elavult átirányítást.
- Új edzés létrehozása megadott és üres időtartammal; a létrejött edzés
  megnyitása és a mentett mezők visszaolvasása.
- Edzéstári név, leírás, programnév és gyakorlatszám megjelenítése;
  törlés megszakítása és megerősítése a megfelelő azonosítóval.

A késleltetéseket a tesztek kézzel feloldható válaszkapukkal vezérlik.
Az alkalmazás időzített átirányításait a Playwright órájával ellenőrzik.

## Meglévő regressziók

A csomag a `workout-edit.spec.ts`, `workspace-editor.spec.ts` és
`workspace-editor-more.spec.ts` eseteit is futtatja mindkét nézetben.
Ezek lefedik a gyakorlatok hozzáadását, sorrendjét és eltávolítását,
a programhoz kötött edzés zárolását és másolását, a programadatok mentését,
a csak olvasható közös gyakorlatlistát, az ismétlést, az ügyfélkiosztást és a mentetlen napi
módosítások elhagyásának megerősítését.

Az aktuális esetlistát a `npx playwright test -c playwright.workout-editor.config.ts --list` paranccsal kérdezheted le.

A fixture az első belépési útmutatót a felület Kihagyás gombjával zárja be;
a további navigációk ugyanazt az azonosított edzői munkamenetet használják.

A HTML-riport a `workout-editor-report/`, a JSON-eredmény és a hibákhoz
tartozó nyomkövetés/képernyőkép a `workout-editor-results/` könyvtárba kerül.
