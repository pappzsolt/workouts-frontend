# Frontend Playwright-bővítés – 2026-10-25

Ebben a körben **68 új teszteset** készült: 38 regisztrációs és 30 adminisztrációs. Mindegyik asztali Chrome- és Pixel 7 Chromium-profilon is fut, így ez **136 új böngészős ellenőrzés**. A korábbi 35 hitelesítési esettel együtt a kibővített csomag **103 tesztet, 206 profil szerinti ellenőrzést** tartalmaz.

A csomag valódi Angular-felületet futtat, rögzített API-válaszokkal. Az ismeretlen API-hívások hibát okoznak. A kliens útvonalvédelmi tesztjei nem helyettesítik a szerveroldali hitelesítési teszteket. Százalékos forráskód-lefedettségi mérés ebben a körben nem készült.

## Futtatás

A frontend és az e2e függőségeinek telepítése, valamint a Chromium telepítése után:

```sh
cd /Users/pappzs/works/develop/workouts-frontend/e2e
npm run test:frontend-contract
```

Az Angular a konfigurációban megadott, külön 4321-es porton automatikusan indul és leáll. Nem kell backend, `.env`, adatbázis vagy tesztfiók. A 4321-es port legyen szabad.

Csak a most hozzáadott tesztek:

```sh
npm run test:frontend-contract -- --grep 'Regisztráció:|Admin kérelmek:'
```

Csak asztali böngésző és a HTML-riport:

```sh
npm run test:frontend-contract -- --project=desktop
npx playwright show-report frontend-contract-report
npm run typecheck
```

JSON-riport: `frontend-contract-results/results.json`. Bukáskor screenshot és trace készül. Retry nincs. A mobilprofil emulált Chromium.

Első telepítéshez a korábbi [hitelesítési útmutató](README_AUTH_CONTRACT.md#futtatás-a-frontend-repóból) használható.

## registration-boundaries.spec.ts

Forrás: [tesztfájl](ui-contract/registration-boundaries.spec.ts)

| Teszt neve | Mit ellenőriz? |
|---|---|
| Regisztráció: hibás felhasználónév nem küldhető (ab) | A kétkarakteres név kliensoldali hibát ad, API-kérés nélkül. |
| Regisztráció: hibás felhasználónév nem küldhető (anna@kiss) | Az @ karakteres név kliensoldali hibát ad, API-kérés nélkül. |
| Regisztráció: hibás felhasználónév nem küldhető (.anna) | Ponttal kezdődő név kliensoldali hibát ad, API-kérés nélkül. |
| Regisztráció: hibás felhasználónév nem küldhető (anna.) | Ponttal végződő név kliensoldali hibát ad, API-kérés nélkül. |
| Regisztráció: érvénytelen jelszó blokkolása (csak szóköz) | A csak szóközökből álló jelszó elutasított, regisztrációs kérés nem történik. |
| Regisztráció: érvénytelen jelszó blokkolása (74 UTF-8 bájt) | A 37 darab kétbájtos á karakterből álló, 74 UTF-8 bájtos jelszó elutasított. |
| Regisztráció: érvénytelen jelszó blokkolása (73 karakter) | A 73 ASCII karakteres jelszó elutasított, regisztrációs kérés nem történik. |
| Regisztráció: érvényes jelszóhatárérték elküldhető (8 karakter) | A nyolckarakteres jelszó sikeresen beküldhető és a megerősítéssel együtt változatlanul jut a kérésbe. |
| Regisztráció: érvényes jelszóhatárérték elküldhető (72 ASCII bájt) | A 72 ASCII bájtos jelszó elfogadott, a kérés és a sikerállapot ellenőrzött. |
| Regisztráció: érvényes jelszóhatárérték elküldhető (72 UTF-8 bájt) | A 36 darab á karakterből álló, pontosan 72 UTF-8 bájtos jelszó elfogadott. |
| Regisztráció: hibás opcionális számmező blokkolja a beküldést (age=9) | A tízéves alsó korhatár alatti életkor blokkolja a beküldést. |
| Regisztráció: hibás opcionális számmező blokkolja a beküldést (age=121) | A 120 éves felső korhatár feletti életkor blokkolja a beküldést. |
| Regisztráció: hibás opcionális számmező blokkolja a beküldést (weight=19.99) | A 20 kg alatti testsúly blokkolja a beküldést. |
| Regisztráció: hibás opcionális számmező blokkolja a beküldést (weight=400.01) | A 400 kg feletti testsúly blokkolja a beküldést. |
| Regisztráció: hibás opcionális számmező blokkolja a beküldést (weight=70.123) | Három tizedesjegyű testsúly blokkolja a beküldést. |
| Regisztráció: hibás opcionális számmező blokkolja a beküldést (height=79.99) | A 80 cm alatti magasság blokkolja a beküldést. |
| Regisztráció: hibás opcionális számmező blokkolja a beküldést (height=250.01) | A 250 cm feletti magasság blokkolja a beküldést. |
| Regisztráció: hibás opcionális számmező blokkolja a beküldést (height=170.123) | Három tizedesjegyű magasság blokkolja a beküldést. |
| Regisztráció: opcionális számmezők határértékei elfogadottak (10/20/80) | Az életkor/testsúly/magasság alsó határértékei elfogadottak; a teljes küldött JSON numerikus és null mezői ellenőrzöttek. |
| Regisztráció: opcionális számmezők határértékei elfogadottak (120/400/250) | Az életkor/testsúly/magasság felső határértékei elfogadottak; a teljes küldött JSON ellenőrzött. |
| Regisztráció: USER névhosszkorlát és Unicode név helyesen működik | USER módban maxlength=50 és az 50 karakteres Unicode felhasználónév helyes accountType-pal beküldhető. |
| Regisztráció: COACH névhosszkorlát és Unicode név helyesen működik | COACH módban maxlength=100 és a 100 karakteres Unicode név helyes accountType-pal beküldhető. |
| Regisztráció: USER→COACH váltás törli a hibás rejtett ügyfélmezőket | USER→COACH váltáskor a hibás életkor és a cél törlődik; csak coachmezők kerülnek a kérésbe, trimmelt specializációval. |
| Regisztráció: COACH→USER váltás törli a hibás rejtett edzőmezőket | COACH→USER váltáskor a hibás telefon és a specializáció törlődik; csak usermezők kerülnek a kérésbe, két tizedessel és trimmelt céllal. |
| Regisztráció: hibás magyar telefonszám blokkolása (36301234567) | A + előtag nélküli magyar telefonszám elutasított, API-kérés nélkül. |
| Regisztráció: hibás magyar telefonszám blokkolása (+3630123456) | A túl rövid +36 telefonszám elutasított, API-kérés nélkül. |
| Regisztráció: függő válasz alatt nincs új beküldés, siker után az űrlap eltűnik | Függő válasznál a beküldőgomb tiltott, csak egy kérés történik; siker után az űrlap eltűnik és loginra lehet navigálni. |
| Regisztráció: HTTP 409 után az adatok megmaradnak és újrapróbálhatók | HTTP 409 hiba után a szerverüzenet, email és újrapróbálható gomb megmarad; a második kérés sikeres. |
| Regisztráció: HTTP 503 után az adatok megmaradnak és újrapróbálhatók | HTTP 503 hiba után az adatok megmaradnak, a második kérés sikeres. |
| Regisztráció: hibás HTTP 200 üzleti válasz nem mutat sikert (success=false) | HTTP 200 success=false nem eredményez sikerállapotot, a szerver hibaüzenete látszik. |
| Regisztráció: hibás HTTP 200 üzleti válasz nem mutat sikert (success=true) | HTTP 200 success=true,data:null nem eredményez sikerállapotot; lokalizált tartalékhiba látszik. |
| Regisztráció: nyelvváltás után a fejléc és a kérés nyelve is helyes (hu) | Magyar nyelvválasztás után magyar fejléc és language=hu kérés ellenőrzött. |
| Regisztráció: nyelvváltás után a fejléc és a kérés nyelve is helyes (en) | Angol nyelvválasztás után angol fejléc és language=en kérés ellenőrzött. |
| Regisztráció: nyelvváltás után a fejléc és a kérés nyelve is helyes (de) | Német nyelvválasztás után német fejléc és language=de kérés ellenőrzött. |
| Regisztráció: a kiválasztott nem enumként kerül elküldésre (MALE) | A Férfi címke választása a MALE enumot küldi az API-nak. |
| Regisztráció: a kiválasztott nem enumként kerül elküldésre (FEMALE) | A Nő címke választása a FEMALE enumot küldi az API-nak. |
| Regisztráció: a jelszó szándékos szélső szóközei nem vesznek el a kérésből | A jelszó elején és végén lévő szándékos szóközök változatlanul megmaradnak a kérésben. |
| Regisztráció: tört életkor bevitele elutasított, érvényes egész számra javítható | A tört életkor bevitelét az input azonnal visszautasítja; egész számra javítva a sikeres kérés 31 éves kort tartalmaz. |

## admin-registration-resilience.spec.ts

Forrás: [tesztfájl](ui-contract/admin-registration-resilience.spec.ts)

| Teszt neve | Mit ellenőriz? |
|---|---|
| Admin kérelmek: a kezdőlap megfelelő státusszal és nulla alapú lapozással kérdez | A kezdeti lekérdezés PENDING státuszt, page=0, size=10, language=hu paramétert kap; tíz sor látszik, az előző oldal tiltott. |
| Admin kérelmek: lapozás után státuszváltás az első oldalról indul és elrejti a döntési gombokat | Második oldalról APPROVED fülre váltás page=0 lekérdezést indít; a döntési gombok eltűnnek, a döntéshozó és a coach neve látható. |
| Admin kérelmek: oldalméret-váltás visszaállítja az első oldalt és a kért darabszámot | Második oldalon a 20-as oldalméret kiválasztása page=0,size=20 kérést és húsz megjelenített sort eredményez. |
| Admin kérelmek: üres PENDING lista a megfelelő üzenetet mutatja | Üres PENDING válasznál a függő kérelmekhez tartozó üzenet látszik; nincs lapozó vagy döntési kérés. |
| Admin kérelmek: üres APPROVED lista a megfelelő üzenetet mutatja | Üres APPROVED válasznál a jóváhagyott kérelmekhez tartozó üzenet látszik; nincs lapozó vagy döntési kérés. |
| Admin kérelmek: üres REJECTED lista a megfelelő üzenetet mutatja | Üres REJECTED válasznál az elutasított kérelmekhez tartozó üzenet látszik; nincs lapozó vagy döntési kérés. |
| Admin kérelmek: ugyanarra a státuszfülre kattintás nem indít új listaolvasást | Az aktív státuszfül újbóli kiválasztása nem küld redundáns listaolvasást. |
| Admin kérelmek: elutasítás megszakítása törli az indoklást, döntési kérés nélkül | Mégse után az indoklásmező eltűnik, újranyitva üres; döntési kérés nem történt. |
| Admin kérelmek: státuszváltás törli a folyamatban lévő elutasítást | Státuszváltás után a megkezdett elutasítás megszűnik; visszatérve sincs megnyitott indoklásmező. |
| Admin kérelmek: elutasítás indoklása normalizált (üres→null) | Csak whitespace indoklás esetén a beküldött reason null; a sikerüzenet után az érintett sor eltűnik. |
| Admin kérelmek: elutasítás indoklása normalizált (trim) | A beküldött indoklás szélső szóközök nélkül kerül az egyetlen, megfelelő id-jú döntési kérésbe. |
| Admin kérelmek: ügyfél jóváhagyása coach nélkül | Ügyfél coachválasztás nélküli jóváhagyása coachId:null törzset küld, és a sor eltűnik. |
| Admin kérelmek: ügyfél jóváhagyása kiválasztott coachcsal | A coach címkéje szerinti választás a valódi numerikus 205 azonosítót küldi; a sikerüzenet és a sor eltűnése ellenőrzött. |
| Admin kérelmek: coach jóváhagyásánál nincs coachválasztó és null coachId kerül elküldésre | Coachkérelemnél nincs coachválasztó; a helyes kérelemazonosítóhoz coachId:null kerül. |
| Admin kérelmek: sikertelen approve után a hiba látszik és a döntés újrapróbálható | HTTP 409 jóváhagyási hiba után a sor és a hiba megmarad, a gomb engedélyezett; újrapróbálva sikeres a második kérés. |
| Admin kérelmek: sikertelen reject után a hiba látszik és a döntés újrapróbálható | HTTP 409 elutasítási hiba után a megerősítés újrapróbálható, a második kérés sikeres. |
| Admin kérelmek: függő döntés alatt minden sor döntési gombja letiltott | Vezérelt válaszkésleltetés alatt az érintett és a többi sor döntési gombjai is letiltottak; válasz után újra használhatók. |
| Admin kérelmek: utolsó oldalon meghozott döntés visszalapoz az utolsó létező oldalra | A harmadik oldal utolsó kérelmének eldöntése után az üres harmadik lap helyett a második lap töltődik be, a következő oldal tiltott. |
| Admin kérelmek: hibás lista-válasz nem látszik sikeres üres listának (http) | HTTP 500 listaolvasási hiba látható üzenetet ad; másik státuszra váltás után az adatok újra betölthetők. |
| Admin kérelmek: hibás lista-válasz nem látszik sikeres üres listának (business) | HTTP 200 success=false listaolvasási hiba látható üzenetet ad; a lista később helyreállítható. |
| Admin kérelmek: hibás lista-válasz nem látszik sikeres üres listának (null-data) | HTTP 200 success=true,data:null listaolvasási hiba látható üzenetet ad; a lista később helyreállítható. |
| Admin kérelmek: coachlista hibájánál coach nélkül is jóváhagyható az ügyfél | Coachlista HTTP 500 hibájánál a Nincs edző opció megmarad, az ügyfél null coachId-val jóváhagyható. |
| Admin kérelmek: anonim megnyitás loginra irányít lista és döntési API-hívás nélkül | A refresh 401 után a route guard loginra irányít, a regisztrációs listát és döntési API-t nem hívja. |
| Admin kérelmek: lassú lista betöltése alatt állapotjelzés látható | Késleltetett listaolvasás alatt Betöltés állapot és üres lista látszik; válasz után megjelenik a kérelem. |
| Admin kérelmek: nem érvényes adminmunkamenet nem kérhet listát (hasonló nevű idegen szerepkör) | ROLE_ADMINISTRATOR nem egyezik ROLE_ADMIN-nal: a kliens loginra irányít és nem kér listát. |
| Admin kérelmek: nem érvényes adminmunkamenet nem kérhet listát (hiányzó szerepkör) | Üres szerepkörrel a kliens loginra irányít és nem kér listát vagy döntést. |
| Admin kérelmek: nem érvényes adminmunkamenet nem kérhet listát (lejárt token) | Lejárt exp mezőjű kliens tokennel a guard loginra irányít, listaolvasás nélkül. |
| Admin kérelmek: több szerepkör közül a pontos ADMIN szerepkör engedélyezi az olvasást | A vesszővel elválasztott szerepkörlista pontos ADMIN eleme szóközök mellett is engedélyezi a kliens útvonalát. |
| Admin kérelmek: a jelentkező neve és profiladatai nem hajthatnak végre HTML-kódot | A név és a profiladat img/script tartalma szövegként jelenik meg; DOM-elem és futó kód nem keletkezik. |
| Admin kérelmek: státuszváltás megszakítja a régi lista kérését, a késői válasz nem írja felül az újat | Státuszváltáskor a régi HTTP-kérés megszakad; a késői PENDING válasz nem írhatja felül az új APPROVED listát. |

## Ellenőrzött eredmény

2026-10-25: **206/206 sikeres** (103 asztali, 103 mobil), 0 bukás, 0 kihagyás,
0 flaky, retry nélkül. A futás 157.6 másodperc volt.
Az új 68 teszthez tartozó mind a 136 böngészős ellenőrzés sikeres.
A teljes e2e TypeScript-ellenőrzés (`tsc -p e2e/tsconfig.json`) is sikeres.

A patch az előző, 35 hitelesítési tesztet tartalmazó bővítésre épül.
Az új csomag azokat is újrafuttatja, a régi `test:auth-contract` parancs
változatlanul használható.
