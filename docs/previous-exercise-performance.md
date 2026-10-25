# Korábbi gyakorlat-eredmények

Az aktív gyakorlat részletein a „Legutóbb” kártya az adott felhasználó ugyanazon gyakorlatához tartozó legutóbbi korábbi edzés teljesített, tényleges eredményeit mutatja sorozatonként. Coach-programok, saját programok és önálló edzések között is keres, azonos katalógusbeli `exerciseId` alapján.

## API

USER bearer token szükséges, az edzés és a gyakorlat összetartozását és tulajdonosát a backend ellenőrzi.

- Web: `GET /api/exercises/user-workouts/{userWorkoutId}/exercises/{exerciseId}/previous-performance`
- Mobil alias: `GET /api/mobile/v1/user-workouts/{userWorkoutId}/exercises/{exerciseId}/previous-performance`
- Swagger: weben **Edzésnapló**, mobilon **Mobile API v1**.

A sikeres válasz `ApiResponse<PreviousExercisePerformance>`:

```json
{
  "success": true,
  "data": {
    "userWorkoutId": 123,
    "performedAt": "2026-10-20T08:15:00Z",
    "sets": [
      { "setNumber": 1, "actualRepetitions": 8, "actualWeightKg": 42.5 },
      { "setNumber": 2, "actualRepetitions": 10, "actualWeightKg": 0 }
    ]
  },
  "message": null
}
```

Ha nincs előzmény, `data=null`. Idegen vagy hiányzó edzés/gyakorlat esetén 404, nem pozitív azonosítónál 400.

## Kiválasztási szabályok

- Kizárólag saját, másik edzésben rögzített, teljesített sorozatok, amelyeknél legalább egy tényleges érték szerepel. Az előírt értékeket nem helyettesíti be.
- A referencia az aktuális edzés kezdési ideje; annak hiányában a teljesítési ideje, majd a jelenlegi idő. Jövőbeli referencia nem alkalmazható.
- A sorozat teljesítési idejének (régi adatoknál az edzés teljesítési idejének) korábbinak kell lennie a referenciánál. Dátum nélküli vagy jövőbeli teljesítést nem használ.
- A legutóbbi ilyen teljesítési idővel rendelkező edzés eredményeit adja vissza, sorozatszám szerinti sorrendben. Az időbélyeg tartalmazza az időzónát.
- A hiányzó súly vagy ismétlés `null` marad; a nulla súly valós érték.

A frontend külön, megszakítható lekéréssel tölti be az előzményt, nem módosítja az aktuális sorozatokat. Üres állapotot, betöltést és újrapróbálható hibát kezel. Az edzés mentése és a coach-folyamatok változatlanok. Adatbázis-migráció nem szükséges.

## Ellenőrzés

Backend integrációs tesztek: legutóbbi saját előzmény több program között, idegen felhasználó kizárása, későbbi és aktuális edzés kizárása, befejezetlen sorozat kizárása, nulla súly, üres állapot, jogosultságok és mobil alias.

Frontend tesztek: értékek és hiányok megjelenítése, üres állapot, hiba és újrapróbálás, navigáláskor régi kérés megszakítása. Helyi Playwright-szerződéstesztek asztali és mobil nézetben, mockolt API-val: `cd e2e && ./node_modules/.bin/playwright test -c playwright.previous-performance.config.ts`.
