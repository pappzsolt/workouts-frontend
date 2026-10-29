# Menüpontok valódi API-s Playwright-ellenőrzése

Az új tesztek az `e2e/live-api` könyvtárban vannak. Nincs API-válasz-helyettesítés,
`route.fulfill`, rögzített teszt-JWT vagy fejlesztői adatbázisra támaszkodó tesztadat.
A fiókok és az üzleti adatok a valódi publikus API-n keresztül jönnek létre.

## Futtatás

A frontend `e2e` könyvtárából, elérhető PostgreSQL mellett:

```sh
IT_POSTGRES_URL=jdbc:postgresql://127.0.0.1:5432/postgres \
IT_POSTGRES_USER="$USER" npm run test:live-api
```

A karbantartási adatbázishoz adatbázis-létrehozási jogosultság szükséges.
A Java tesztsegéd külön `workouts_it_...` adatbázisokat hoz létre, production
Liquibase-migrációkkal; szabályos leállításkor törli ezeket. A tesztek a saját
adataikat használják, ezért nincs szükség meglévő fiókra vagy programra.
Python 3 az Excel ZIP/XML szerkezetének ellenőrzéséhez szükséges; külső Python
csomag nincs használatban.

A konfiguráció asztali Chromium és Pixel 7 nézetet futtat, újrapróbálkozás nélkül.
Célzott futás például:

```sh
npm run test:live-api -- coach-workspace-real --project=desktop
```

## Környezet

- Angular: `127.0.0.1:4323`.
- Normál backend: `127.0.0.1:8099`, a szokásos tokenidőkorlátokkal.
- Külön auth backend: `127.0.0.1:8100`, saját adatbázissal, 10 másodperces access
  és 20 másodperces refresh élettartammal, 2 másodperces zárolással.
  A lejáratot ténylegesen kivárjuk; az óra és a token aláírása nincs helyettesítve.
- Helyi SMTP: `127.0.0.1:1026`; mailbox HTTP: `127.0.0.1:8026`.
  A kézbesítési hibateszt a valódi SMTP DATA kérésre egyszer `451` választ küld,
  majd ellenőrzi az alkalmazás tartós outboxának újrapróbálkozását.
- Az offline böngészős teszt a böngészőkörnyezet hálózatát kapcsolja ki/be;
  nem generál mesterséges API-választ.

A rövid időkorlátok kizárólag a külön teszt-backendre vonatkoznak. Az alkalmazás
production forráskódját és beállításait ez a tesztbővítés nem változtatja meg.

## Menüpont és tesztfájl

| Terület | Tesztfájl | Ellenőrzött folyamatok |
|---|---|---|
| Edző – áttekintés, ügyfelek | `coach-workspace-real.spec.ts` | Program nélküli, tervezett, megkezdett, teljesített, kihagyott, lejárt és jövőbeli állapot; összesítők, saját ügyfelek, keresés, részletfülek, sorozatcél mentése és napváltás. |
| Edző – programok | `coach-workspace-real.spec.ts` | Metaadatok szerkesztése és újratöltése; nap áthelyezése és API-visszaolvasás; program törlése érintetlen, részleges, megkezdett és kész edzés mellett. |
| Edző – másolás, kiosztás | `coach-workspace-real.spec.ts` | Böngészős másolás ügyfélhez rendelésével; párhuzamos másolás/kiosztás, kiosztás-visszavonás versenye; böngészős visszavonás és újrakiosztás, előzménymegőrzés. |
| Edző – edzések, sablonalkalmazás | `library-template-real.spec.ts` | Szabad, programhoz kapcsolt, kiosztott és történeti edzés törlése; kétablakos szerkesztés; érintetlen, csak célértékes, részleges, megkezdett, kész, visszavont állapot; teljesítés és sablonalkalmazás versenye. |
| Edző – gyakorlatok | `library-template-real.spec.ts` | Keresés és a tesztadatok testrész/eszköz mátrixa, üres találatokkal; szabad és kapcsolt gyakorlat törlése. |
| Edző és user – profil | `profile-report-real.spec.ts` | A felületen szerkeszthető profiladatok mentése, újratöltése, API-visszaolvasása; hibás jelenlegi jelszó, sikeres jelszócsere, régi jelszó tiltása, új belépés. |
| Edző és user – hibabejelentés | `profile-report-real.spec.ts` | Beküldés PNG-képpel, admin bejelentkezés és visszaolvasás a felületen, képbetöltés; admin lista tiltása a bejelentőnek. |
| User – kezdőlap | `user-journey-real.spec.ts` | Mind a hat kártya megnyitása és az oldal újratöltése valódi munkamenettel. |
| User – programok, naptár | `user-journey-real.spec.ts` | Aktív/jövőbeli/lejárt program keresése és megnyitása; naptári hónapváltás, keresés, edzésrészlet, három böngésző-időzóna. |
| User – végrehajtás és előzmény | `user-journey-real.spec.ts` | Mentett teljesítés utáni automatikus továbblépés; kész edzés visszavonásakor helyben maradás; előző alkalom tényleges súlyának megjelenítése, új eredmény elkülönítése. |
| User – saját program | `user-journey-real.spec.ts` | Létrehozás gyakorlatválasztással, mentés, kétablakos verzióütközés, indítás, másolás és piszkozat törlése. |
| User – önálló edzés, sablon | `user-journey-real.spec.ts` | Indítás, teljesítés, sablonmentés, kedvenc, új alkalom indítása/teljesítése, ismétlés; korábbi eredmény nem másolódik. |
| User – statisztika | `statistics-auth-real.spec.ts` | Összesítő, aktivitás és gyakorlatonkénti fejlődés valódi végpontjai; saját/idegen user, coach, admin, anonim; statisztika felületi betöltése. |
| Belépés/kijelentkezés, jelszóhelyreállítás | `statistics-auth-real.spec.ts`, meglévő `password-reset-real.spec.ts` és `workout-real.spec.ts` | Valódi access/refresh lejárat, zárolás/feloldás, két külön böngészős munkamenet; offline újrapróbálás, valódi SMTP-hiba és outbox újraküldés, emailes jelszócsere. |
| Edző és user – Excel-import/export | `import-export-real.spec.ts` | HU/EN/DE export ZIP/XML megnyithatóság és tartalom; böngészős letöltés; előellenőrzés és import; két eredeti heti munkafüzet, képletekkel; hibás kiterjesztés, üres/túl nagy/sérült fájl. |

Az `import-recovery-real.spec.ts` valódi, kétértelmű katalógustalálatból indul:
azonos nevű gyakorlatok közül a felhasználó konkrét azonosítót választ a felületen.
Ezután a teszt a böngésző hálózatát valóban kikapcsolja az importnál, ellenőrzi a
hibát és a nulla létrejött másolatot, majd új előellenőrzés után egyszer importál.
A végső listában pontosan egy új programnak kell szerepelnie.
A `workout-concurrency-real.spec.ts` két külön ablak mentését egyszerre indítja,
majd mindkét ablakban visszaolvassa az API-ban tárolt közös végeredményt.

A parameterizált mátrixok konkrét, reprodukálható eseteket jelentenek. Végtelen
szöveg-, fájl-, hálózati és egyidejűségi kombináció teljes lefedettségét nem
állítjuk. Az API-központú versenyhelyzetek Playwright `APIRequestContext`-et
használnak; a felületi folyamatok tényleges böngészőinterakciókat is végeznek.

Az `analytics-boundaries-real.spec.ts` további tesztjei a tavaszi és őszi
óraátállítás napját három időzónában, a belépési név változtatását, a több ügyfélből
számolt összesítőket, minden keresőmezőt, valamint két hét tényleges eredményeiből
számolt volumen-, e1RM- és zónagrafikonokat ellenőrzik. Az adattáblázatot is
összevetik az API-n rögzített értékekkel.

Az Angular szervert a frontend gyökeréből kell indítani. Az `e2e` munkakönyvtárból
indított Angular megtalálhatja a workspace-t, miközben a Tailwind relatív
forrásmintái nem találják a komponenseket. A konfiguráció ezért explicit `cwd`-t
használ; a tesztelt felület így a normál alkalmazásstílusokkal jelenik meg.

## Riportok

- HTML: `live-api-report/index.html`
- Gépi eredmény: `live-api-results/results.json`
- Hiba esetén képernyőkép és Playwright trace a teszt eredménykönyvtárában.
- Alkalmazásforrásra szűrt V8 frontend coverage és backend JaCoCo-riport a meglévő
  `coverage-teardown.ts` / `scripts/report-live-coverage.cjs` folyamaton keresztül.

A csomag 109 új forgatókönyvet tartalmaz; asztali és mobilnézettel ez 218 új
ellenőrzés. A korábbi 36 esettel a teljes csomag 254 ellenőrzés.

**Végleges eredmény: 254/254 valódi API-s Playwright-ellenőrzés sikeres,
0 bukás, 0 kihagyás, 0 flaky és 0 futtatókörnyezeti hiba.**
A teljes frontend-egységteszt-csomag is sikeres: **533/533**.

A KÉSZ-kattintási hiba javítva. A korábban hibázó három folyamat és az új,
közvetlen kattintási regresszió asztalon és mobilon is a teljes sikeres futás része.
A mentés, pihenőidőzítő és automatikus továbblépés szabályai nem változtak.
Részletek: [Valódi API-s futás megállapításai](KNOWN_LIVE_API_FINDINGS.md).

A legutóbbi teljes futás HTML-riportja: `live-api-report/index.html`;
gépi eredménye: `live-api-results/results.json`.
A teljes és célzott futások naplói, valamint az összesítés:
`live-api-results/verification/`.
