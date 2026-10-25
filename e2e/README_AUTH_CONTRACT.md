# Hitelesítési Playwright-tesztek

35 új teszteset a valódi Angular-felületen, asztali Chrome- és Pixel 7
Chromium-profilon: összesen 70 böngészős ellenőrzés. A témák: belépés,
elfelejtett jelszó, jelszócsere, nyelvváltás és ezek mobil megjelenése.

Az API-válaszokat a Playwright rögzített tesztadatokból szolgálja ki. Ismeretlen
API-hívás hibát okoz; nincs általános sikeres fallback. A csomag nem olvas `.env`
fájlt, nem használ valódi fiókot, adatbázist, emailküldést vagy szerveroldali
tokent. A valódi backend hitelesítését a meglévő live csomagok ellenőrzik.

## Futtatás a frontend repóból

Első alkalommal a frontend és az e2e függőségeit is telepítsd:

```sh
cd /Users/pappzs/works/develop/workouts-frontend
npm ci
cd e2e
npm ci
npx playwright install chromium
npm run test:auth-contract
```

Ha a függőségek és a Chromium már telepítve vannak:

```sh
cd /Users/pappzs/works/develop/workouts-frontend/e2e
npm run test:auth-contract
```

A konfiguráció automatikusan indít és leállít egy külön Angular fejlesztői
szervert a `http://127.0.0.1:4321` címen. Nem kell másik terminálban `npm start`.
A 4321-es port legyen szabad; a teszt nem vesz át már futó szervert.
Az Angular CLI közvetlenül indul, így a frontend `prestart` verziófrissítője
nem módosítja a forrásfájlokat.

Csak asztali böngésző:

```sh
npm run test:auth-contract -- --project=desktop
```

Csak jelszócsere:

```sh
npm run test:auth-contract -- --grep 'Jelszócsere:'
```

Látható böngészővel:

```sh
npm run test:auth-contract -- --headed
```

## Riport és ellenőrzés

```sh
npx playwright show-report auth-contract-report
npm run typecheck
```

JSON-riport: `auth-contract-results/results.json`. Bukáskor képernyőkép és trace
is készül. Retry nincs. A mobilprofil emulált Chromium, nem fizikai telefon.
Az API-várakozást vezérelt Promise kezeli, rögzített sleep nélkül.

## Új tesztek

A következő táblázatban minden név egy önálló tesztet jelöl. Mindegyik két
böngészőprofilon fut. A tesztek neve magyarul írja le az ellenőrzött viselkedést.

| Teszt neve | Mit ellenőriz? |
|---|---|
| Belépés: hiányzó kötelező mező nem indít kérést (mindkettő) | Üres felhasználónév és jelszó esetén látható mezőhiba jelenik meg, és nem indul login kérés. |
| Belépés: hiányzó kötelező mező nem indít kérést (jelszó) | Kitöltött felhasználónév mellett az üres jelszó blokkolja a belépési kérést. |
| Belépés: hiányzó kötelező mező nem indít kérést (felhasználónév) | Kitöltött jelszó mellett az üres felhasználónév blokkolja a belépési kérést. |
| Belépés: függő kérés alatt a gomb letiltott, elutasítás után a mezők szerkeszthetők | Vezérelt válaszkésleltetés alatt letiltott gomb és Betöltés felirat látszik; a 401 üzenete és a pontos JSON-törzs ellenőrzött, utána a gomb engedélyezett. |
| Belépés: HTTP 200 success=false nem jelent sikeres bejelentkezést | A sikeres HTTP-státusz mellett érkező success=false választ a felület hibának kezeli, és a login oldalon marad. |
| Belépés: hálózati hiba után az Enter billentyűvel újrapróbálható a kérés | Hálózati hiba után a gomb újra engedélyezett; Enterrel második kérés küldhető, és annak válasza jelenik meg. |
| Belépés: régi access és refresh tokenek eltűnnek a localStorage-ból | A korábbi verzióból megmaradt accessToken és refreshToken kulcsok eltűnnek a localStorage-ból API-belépés nélkül. |
| Belépés: elfelejtett jelszó és visszalépés valódi router-navigációval működik | A login linkje a jelszóemlékeztetőhöz visz; a visszagomb API-kérés nélkül visszajuttat a loginhoz. |
| Nyelvváltás: a jelszóemlékeztető feliratai és a kérés nyelve egyezik (hu) | Magyar nyelvválasztás után magyar fejléc és gomb látszik, a kérés language=hu paramétert kap. |
| Nyelvváltás: a jelszóemlékeztető feliratai és a kérés nyelve egyezik (en) | Angol nyelvválasztás után angol fejléc és gomb látszik, a kérés language=en paramétert kap. |
| Nyelvváltás: a jelszóemlékeztető feliratai és a kérés nyelve egyezik (de) | Német nyelvválasztás után német fejléc és gomb látszik, a kérés language=de paramétert kap. |
| Publikus hitelesítési űrlap nem lóg túl a képernyőn (/login) | A login űrlap látható és nincs vízszintes túllógás a profil képernyőszélességén. |
| Publikus hitelesítési űrlap nem lóg túl a képernyőn (/forgot-password) | A jelszóemlékeztető űrlap látható és nincs vízszintes túllógás. |
| Publikus hitelesítési űrlap nem lóg túl a képernyőn (/reset-password) | A jelszócsere űrlap látható és nincs vízszintes túllógás. |
| Elfelejtett jelszó: hibás email nem indít API-kérést (üres) | Üres emailt a kliensoldali validáció API-kérés nélkül elutasít. |
| Elfelejtett jelszó: hibás email nem indít API-kérést (not-an-email) | Hibás emailformátumot a kliensoldali validáció API-kérés nélkül elutasít. |
| Elfelejtett jelszó: sikeres kérés csak az emailt küldi, és a szerver üzenetét mutatja | A JSON csak emailt tartalmaz, magyar nyelvparaméterrel; a szerver sikerüzenete látszik, az oldal nem navigál el. |
| Elfelejtett jelszó: folyamatban lévő kérés alatt a küldés letiltott | Függő válasz alatt a Küldés feliratú gomb letiltott; válasz után a sikerüzenet megjelenik és a gomb újra használható. |
| Elfelejtett jelszó: HTTP 429 után látható a szerverhiba és újra lehet próbálni | A 429 szerverüzenete megjelenik; újrapróbálás után a sikerüzenet váltja a hibát, két kérés történik. |
| Elfelejtett jelszó: HTTP 503 után látható a szerverhiba és újra lehet próbálni | A 503 szerverüzenete megjelenik; újrapróbálás után a sikerüzenet váltja a hibát, két kérés történik. |
| Elfelejtett jelszó: üres HTTP 503 üzenetnél a lokalizált tartaléküzenet jelenik meg | Hiányzó backend üzenet esetén a magyar szolgáltatáselérhetőségi tartalékszöveg látszik. |
| Elfelejtett jelszó: hálózati hiba után az űrlap megőrzi az emailt és újra használható | Hálózati hiba után lokalizált hibaüzenet látszik, az email megmarad és a küldés engedélyezett. |
| Jelszócsere: hiányzó token letiltja a mentést (nincs paraméter) | Token queryparaméter nélkül az érvénytelen link üzenete látszik, a mentés letiltott és nincs reset kérés. |
| Jelszócsere: hiányzó token letiltja a mentést (whitespace) | Csak whitespace token esetén az érvénytelen link üzenete látszik, a mentés letiltott és nincs reset kérés. |
| Jelszócsere: érvénytelen jelszóhossz nem indít kérést (0 karakter) | Üres új jelszóval a mezővalidáció látható hibát jelez és nem küld reset kérést. |
| Jelszócsere: érvénytelen jelszóhossz nem indít kérést (7 karakter) | A minimumnál rövidebb, hétkarakteres jelszó blokkolja a reset kérést. |
| Jelszócsere: érvénytelen jelszóhossz nem indít kérést (73 karakter) | A maximumnál hosszabb, 73 karakteres jelszó blokkolja a reset kérést. |
| Jelszócsere: eltérő megerősítés javításig blokkolja a kérést | A nem egyező megerősítésnél nincs API-kérés; javítás után egyetlen kérés sikeres, és megjelenik a válasz. |
| Jelszócsere: a 8 karakteres határérték elfogadott, a token trimmelve kerül elküldésre | A nyolckarakteres alsó határérték elfogadott; a küldött törzs csak trimmelt tokent és új jelszót tartalmaz, siker után az űrlap eltűnik és loginhoz lehet navigálni. |
| Jelszócsere: a 72 karakteres határérték elfogadott, a token trimmelve kerül elküldésre | A 72 karakteres felső határérték elfogadott; a törzs csak trimmelt tokent és új jelszót tartalmaz, siker után az űrlap eltűnik. |
| Jelszócsere: folyamatban lévő mentés alatt a gomb letiltott, siker után nincs újraküldhető űrlap | Függő mentésnél Mentés felirat és letiltott gomb látszik; üzenet nélküli sikernél a magyar sikerüzenet jelenik meg és az űrlap eltűnik. |
| Jelszócsere: HTTP 400 lokalizált hibát ad, a token és a kitöltés megmarad | A 400 hiba a lejárt/hibás token magyar tartaléküzenetét mutatja, a jelszó, URL és újrapróbálható űrlap megmarad. |
| Jelszócsere: HTTP 503 lokalizált hibát ad, a token és a kitöltés megmarad | A 503 hiba a szolgáltatáselérhetőségi magyar tartaléküzenetet mutatja, a jelszó, URL és űrlap megmarad. |
| Jelszócsere: HTTP 500 lokalizált hibát ad, a token és a kitöltés megmarad | Az 500 hiba az általános magyar reset hibát mutatja, a jelszó, URL és újrapróbálható űrlap megmarad. |
| Jelszócsere: HTTP 200 success=false is hibaként jelenik meg | A HTTP 200 mellett érkező success=false backendüzenetet a felület hibaként mutatja; az űrlap megmarad és nincs sikerjelzés. |

## Ellenőrzött eredmény

2026-10-25: **70/70 sikeres**, 0 kihagyás, 0 flaky, 0 bukás, retry nélkül.
A tesztfutás 55,7 másodperc volt a helyi Angular-kiszolgálóval.
A teljes `npm run typecheck` ellenőrzés is sikeres.
