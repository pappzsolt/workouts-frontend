# Valódi API-s frontend- és backendtesztek

Ez a csomag közvetlen HTTP-kapcsolaton hívja a futó Spring alkalmazást.
Nincs `page.route`, HTTP-válaszhelyettesítés, Mockito, MockMvc vagy kézzel
előállított access token az új tesztekben. A böngésző a valódi bejelentkezést
használja; a tesztadat-előkészítés is a nyilvános alkalmazás-API-n történik.

A futás saját, véletlen `workouts_it_...` PostgreSQL-adatbázist hoz létre,
a production Liquibase-lánccal. Az első admin a production bootstrap
mechanizmusán keresztül jön létre. A további fiókok, gyakorlatok és edzések
API-kérésekkel készülnek. A rate limitek és a jogosultsági ellenőrzések az
alkalmazás alapbeállításain maradnak. A külön helyi HTTP-környezethez CORS
origin és nem Secure helyi refresh-cookie tartozik.

A helyi SMTP-fogadó valódi SMTP-protokollon kapja a leveleket. Az emailes
jelszó-visszaállítási teszt ebből olvassa ki az alkalmazás által küldött linket;
nem közvetlen adatbázis-lekérdezésből vagy tesztvégpontból kapja a tokent.

## Telepítés és futtatás

Mindkét repóban legyenek ott az ehhez tartozó patch változásai. Java 25,
Node/npm és PostgreSQL szükséges; a PostgreSQL-fióknak adatbázis-létrehozási
jog kell. Kizárólag a `postgres` karbantartási adatbázis URL-je fogadható el.
Az alkalmazás valódi fejlesztői/production adatbázisát a teszt nem használja.

```sh
cd /Users/pappzs/works/develop/workouts-frontend
npm ci
cd e2e
npm ci
npx playwright install chromium

export IT_POSTGRES_URL=jdbc:postgresql://localhost:5432/postgres
export IT_POSTGRES_USER="$USER"
export IT_POSTGRES_PASSWORD=''
npm run test:live-api
```

A Playwright mindhárom helyi folyamatot indítja és leállítja:

- SMTP 1026, postafiók-HTTP 8026;
- Spring backend 8099, saját PostgreSQL-adatbázissal;
- Angular 4323, a `live-api` környezetben közvetlenül a 8099-es API-ra kötve.

Ezek a portok legyenek szabadok. Meglévő kiszolgálót a csomag nem vesz át.
A backend repó alapértelmezett helye a frontend szomszédságában lévő
`workouts-project`; más elrendezésnél az `E2E_BACKEND_DIR` abszolút útvonalat
kell megadni. A csomag nem tölti be a korábbi E2E `.env` fájlt.

Az Angular CLI közvetlenül indul; az alkalmazás verziófrissítő prestart
scriptje nem fut. Nincs szükség külön `npm start` terminálra.

Csak egy profil vagy csak egy folyamat:

```sh
npm run test:live-api -- --project=desktop
npm run test:live-api -- --grep 'SMTP'
```

Minden futás új, külön adatbázissal indul. A saját üzleti adatok a teszt végén
API-val törlődnek, ahol van törlési végpont; a teljes tesztadatbázist a Java
kiszolgáló lezáráskor törli. A folyamat kényszerű SIGKILL leállítása a takarítást
megszakíthatja, ahogyan a meglévő PostgreSQL-integrációs csomagnál is.

## Lefedettségi riportok

A böngésző natív V8 JavaScript-lefedettséget gyűjt, amelyet a forrástérképek
visszavezetnek az alkalmazás forrásaira. Minden saját TypeScript-forrást
számba veszünk: a be nem töltött fájlok nulla számlálókat kapnak. A tisztán
típusokat tartalmazó fájloknak nincs végrehajtható utasításuk. A harmadik fél
node_modules kódja nem alkalmazáskód. A `.spec.ts` és `.d.ts` fájlok sem
részei az alkalmazás mérési nevezőjének.

```sh
npm run coverage:live-api
npm run coverage:live-api:check
npx playwright show-report live-api-report
npm run typecheck
```

- HTML kódlefedettség: `live-api-coverage/index.html`;
- gépi összesítés: `live-api-coverage/coverage-summary.json`;
- az adott futásban be nem töltött források: `live-api-coverage/unmeasured-sources.json`;
- JUnit-szerű teszteredmény JSON: `live-api-results/results.json`;
- bukáskor screenshot és trace a teszt eredménykönyvtárában.

A `coverage:live-api:check` pontosan 100% sort, utasítást, függvényt és ágat
követel; az el nem ért végrehajtható TypeScript-források miatt is hibázik.
Nem csökkentettük a küszöböt. A sikeres Playwright-futás ettől külön
ellenőrzés: sikeres tesztek mellett is lehet piros a 100%-os kapu.

A V8/Istanbul böngészős mérés és a korábbi Karma-instrumentálás számlálói
eltérnek; százalékaikból nem szabad javulást vagy romlást számolni.
A backend összesített riportjának elkészítése és a részletes eredmények:
[backend és közös tesztútmutató](../../workouts-project/docs/live-api-testing.md).

## A most hozzáadott esetek

- `gyakorlat szerkesztése és újratöltése (hu/en/de)`: három nyelven mentés, API-visszaolvasás és újratöltés utáni mezőértékek (6 futás desktop/mobil).
- `nem létező gyakorlat szerkesztése visszavisz a listára`: hiányzó azonosító kezelése, szerkesztőűrlap hiánya (2 futás).
- Javított meglévő teszt: kijelentkezéskor a fejléc gombja egyértelműen kiválasztható.
- Javított fixture: navigáláskor és újratöltéskor megmarad a felületen választott nyelv.

A teljes csomag 18 nevesített esetet, desktop és mobil profillal 36 futást tartalmaz.
A backend Maven-fordítását és ezt a csomagot egymás után futtasd; a futó Spring kiszolgáló classpath-jának változtatása megzavarhatja a fejlesztői újratöltést.

## Ellenőrzött eredmény

2026-10-25: a teljes valódi API-s csomag **36/36 sikeres**, kihagyás és újrapróbálkozás nélkül; `npm run typecheck` sikeres.

| Natív böngészős V8/Istanbul mutató | Eredmény |
| --- | ---: |
| Sor / utasítás | 71,18% |
| Ág | 63,80% |
| Függvény | 25,35% |

249 alkalmazásforrás szerepel a riportban; 2 végrehajtható TypeScript-környezetváltozat nem töltődött be, ezért nullával szerepel. A `coverage:live-api:check` **nem teljesül**, a kód nincs 100%-ban lefedve. Az új esetek tényleges nyelvaktiválásra várnak, és újratöltés után a nyelvválasztást is ellenőrzik. A kijelentkezési eset a korábbi refresh token szerveroldali visszavonását is valódi API-hívással ellenőrzi.

Egy betöltött scripthez nem volt forrástérkép (`unmappedScripts` a JSON-riportban). A szigorú kapu ezt is hibának tekinti, így hiányos forrástérképezés mellett sem adhat 100%-os sikert.
