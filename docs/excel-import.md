# Excel-import az edzői és felhasználói felületen

Az import minden feltöltéskor **új programot** hoz létre. Meglévő program
kiválasztására vagy felülírására nincs lehetőség.

- Edző: Programok → Excel-import (`/coach/programs/import`). Az ügyfél adatlapján
  ugyanez a gomb előre kiválasztja az ügyfelet. A listában a bejelentkezett edző
  ügyfelei jelennek meg; a jogosultságot a backend is ellenőrzi.
- Felhasználó: Saját programok vagy Programjaim → Excel-import
  (`/user/personal-programs/import`). Nincs célfelhasználó-választás; a backend a
  bejelentkezésből határozza meg a tulajdonost. Edző nélküli fiókkal is használható.

A heti edzésterv és a meglévő magyar/angol/német export tölthető fel. A fájl
nem üres `.xlsx` lehet, legfeljebb 5 MB. A program neve opcionális. Heti tervnél
a kezdődátum az első hét hétfője; exportnál üresen hagyva megmaradnak az eredeti
dátumok. A program tartalmának nyelve külön választható.

## Folyamat

1. Fájl, szükség esetén ügyfél, programnév és kezdődátum megadása.
2. Előellenőrzés: dátumok, edzés-/gyakorlat-/sorozatszám és figyelmeztetések.
3. Az ismeretlen vagy többértelmű gyakorlatnevek megfeleltetése a kereshető,
   lapozható gyakorlattárból. Az azonosítók segítik az azonos nevű tételek
   megkülönböztetését. Megfeleltetés után új ellenőrzés szükséges.
4. Új program létrehozása. A sikeres mentés után a létrehozott program megnyitható.

Bármely bemenet módosítása érvényteleníti az előnézetet. A mentés pontosan az
ellenőrzött fájlt és paramétereket küldi el. Mentés alatt a gombok és az elnavigálás
tiltottak; siker után újabb mentéshez külön új importot kell kezdeni. Bizonytalan
hálózati válasznál nincs automatikus ismétlés, a felület a programlista ellenőrzését
kéri a duplikálás elkerülésére.

A felhasználói import azonnal használható, indított saját programot hoz létre,
az ütemezéssel és a felhasználói sorozatokkal együtt. A szerkezet későbbi
módosításához a sajátprogram-felület másolási lehetősége használható.

## Backend-függőség

A frissített backend szükséges, az alábbi multipart végpontokkal:

- `/api/user-programs/import/preview`, `/api/user-programs/import`
- `/api/me/personal-programs/import/preview`, `/api/me/personal-programs/import`

A preview válasz `unresolvedExercises: { name: string; candidateIds: number[] }[]`
mezőt is tartalmaz. A megfeleltetés `exerciseMappings` nevű JSON multipart rész.
A saját import kérésében nincs `userId`. A böngésző állítja elő a multipart
Content-Type határjelét; a program nyelve explicit HTTP-paraméter.

## Ellenőrzések

```sh
node node_modules/@angular/cli/bin/ng.js build --configuration production
node node_modules/@angular/cli/bin/ng.js test --watch=false
node --test scripts/i18n.test.cjs scripts/theme.test.cjs
cd e2e
node node_modules/@playwright/test/cli.js test --config=playwright.excel-import.config.ts
```

A böngészőtesztek helyi Angular szervert használnak, minden API-hívást tesztválasz
szolgál ki. Edzői és saját importot, megfeleltetést, az előnézet érvénytelenítését,
hibás fájlt, mentési hibát és mobil szélességet ellenőriznek. Éles adatot nem írnak.
