# Saját készítésű programok: naptár, sorozatcélok és indítás

A dashboard **Saját készítésű programok** kártyája a `/user/personal-programs`
oldalt nyitja meg. Innen többnapos program, önálló edzés, edzéssablon és Excel-import
is elérhető. A saját programot a felhasználó saját magának készíti, coach-kiosztás nélkül.
A coach által kiosztott programok továbbra is az **Edzésprogramjaim** oldalon érhetők el.

## 1. Programadatok megadása

Az **Új saját program** a `/user/personal-programs/new` szerkesztőt nyitja meg.
Adj nevet és időtartamot; a leírás, nehézség és kezdőnap opcionális.
Az időtartam naptári napokban értendő, a pihenőnapokkal együtt.

Az 1. programnap a kezdőnapra esik, nem feltétlenül hétfőre. Például szerdai
kezdőnapnál a 8. programnap a következő szerda. Ha a kezdőnapot üresen hagyod,
indításkor az aznapi dátum lesz a kezdőnap. Múltbeli kezdőnappal a terv nem indítható.

## 2. Edzésnap kiválasztása a naptárban

A naptárban válassz napot, majd kattints az **Edzésnap hozzáadása** gombra.
Adj nevet az edzésnek, és a **Gyakorlat hozzáadása** segítségével válassz a katalógusból.
A gyakorlatok sorrendje az **Előrébb** és **Hátrébb** gombokkal változtatható.
Edzés nélküli napot pihenőnapként hagyhatsz. Hosszabb programban a nyilakkal
válthatsz hónapot; kezdőnap nélkül a programnapok sorszáma alapján tervezhetsz.

Az **Ismétlés hetente** az adott edzést és sorozatcéljait a programon belüli következő
hetek még üres megfelelő napjaira másolja. A foglalt napokat kihagyja. A másolatok
külön szerkeszthetők: a második hét súlyának módosítása nem írja át az első hetet.
Napváltás és ismétlés után is szükséges a teljes program mentése.

## 3. Sorozatonkénti célértékek

Gyakorlatonként minden sor egy tervezett sorozatot jelent:

| Mező | Jelentés |
| --- | --- |
| Cél ismétlés | Az adott sorozatra tervezett ismétlésszám, 1–200. |
| Cél súly | Tervezett külső súly kg-ban; üresen is hagyható. Legfeljebb két tizedes, 0–9999,99 kg. |
| Pihenő | Az adott sorozat utáni tervezett pihenő, 0–3600 másodperc. |
| Tervezett RPE | Opcionális, a sorozat végére várt erőkifejtés 0–10 között, félpontos lépésekben. |
| Megjegyzés | Az adott sorozathoz tartozó szöveg, legfeljebb 255 karakter. |

A sorozatoknak lehet eltérő súlyuk, ismétlésük, pihenőjük és RPE-jük.
A **Sorozat hozzáadása** az utolsó sor célértékeivel hoz létre új sort;
gyakorlatonként 1–20 sorozat állítható be. Az **Első sorozat értékei mindre**
az összes többi sor célértékeit és megjegyzését felülírja, ezért az eltérő sorozatokat
utána módosítsd. A törlés az adott tervezett sorozatot távolítja el.

Mobilon és szűkebb panelen a mezők sorozatonként egymás alá rendeződnek.
Régi terv megnyitásakor az eddigi ismétlés, pihenő és megjegyzés minden sorban
megjelenik; az új súly- és RPE-mező üres, amíg ki nem töltöd.

## 4. Mentés és indítás: két külön művelet

A **Piszkozat mentése** az összes nap tervét és sorozatcéljait tárolja.
Ettől még nem jönnek létre végrehajtható edzésalkalmak.
A **Program indítása** mentett, legalább egy edzésnapot és minden edzésen
legalább egy gyakorlatot tartalmazó tervnél érhető el. Az indítást meg kell erősíteni.

Indításkor létrejönnek a dátumhoz kötött edzések a megadott sorozatcélokkal,
tényleges eredmények és teljesítési jelölések nélkül. Az **Edzések megnyitása**
gomb vezet a végrehajtáshoz. Ott a tényleges súlyt és ismétlést az elvégzett munka
alapján rögzítsd; a terv mentése és az edzés megnyitása nem jelent teljesítést.

Az elindított terv szerkezete zárolt. A **Másolat készítése** új, szerkeszthető
piszkozatot készít a mentett gyakorlatokkal és sorozatcélokkal, eredmények nélkül.
A kezdőnapot újra állítsd be vagy ellenőrizd, majd külön indítsd el az új tervet.
A korábbi edzések eredményei megmaradnak.

## Hibák és mentetlen szerkesztés

- Mentéskor a többi nap sorozatcéljait is ellenőrzi a rendszer. Hibánál válaszd ki
  az érintett napot, javítsd az értékeket, majd próbáld újra.
- Sikertelen mentésnél a beírt értékek megmaradnak. Másik ablak időközbeni mentése
  elavultverzió-hibát okozhat; az üzenetet olvasd el, mielőtt újratöltenéd az oldalt.
- Az oldal elhagyásakor a mentetlen változásokat megerősítés védi. Az útmutató
  léptetése és a naptári nap kiválasztása önmagában nem menti a programot.
- A teljes terv legfeljebb 1000 gyakorlat-előfordulást és 5000 sorozatot tartalmazhat;
  egy edzésnapon legfeljebb 100 gyakorlat szerepelhet.
- Nyelvváltáskor a feliratok és a katalógusnevek frissülnek, a helyi terv megmarad.

## Önálló edzés, sablon és import

Az **Önálló edzés létrehozása** egyetlen alkalomhoz készült: nincs többnapos naptár,
időtartam vagy nap-sorszám. A sorozatcélok szerkesztése és a mentés–indítás sorrendje
ugyanaz. Az elindított edzés **Új alkalom** gombja új, dátum nélküli piszkozatot ad,
a gyakorlatokkal és sorozatcélokkal, a korábbi eredmények nélkül.

A már mentett önálló edzésből sablon készíthető. A sablon és az új alkalom is megőrzi
a sorozatcélokat; részletek: [Saját edzéssablonok és kedvencek](workout-templates.md).

Az Excel-import külön folyamat: előellenőrzés és gyakorlatpárosítás után a tényleges
import az ütemezett edzéseket is létrehozza. Az importált saját program ezért már
elindított, zárolt állapotban nyílhat meg; nem a kézzel készített piszkozat indítási
lépéseit kell követni. A fájl ismételt importálása új programot hoz létre.

## Felhasználói útmutató és technikai kapcsolódások

Az oldalsáv **Felhasználói útmutató** pontja újraindítja a meglévő vezetett bemutatót.
A saját programokhoz négy külön lépés tartozik: programadatok, naptáras tervezés,
sorozatcélok, mentés és indítás. A bemutató magyarul, angolul és németül használható;
nem ad hozzá edzést, nem ment és nem indít programot.

A saját programok a `/api/me/personal-programs` API-t használják.
A sorozatcélokhoz a `064-personal-set-targets` Liquibase-migrációt tartalmazó backend
szükséges. Az opcionális `workout_exercises.set_targets` mező a meglévő táblát bővíti;
indításkor a célok a meglévő `user_workout_exercise_sets` rekordjaiba kerülnek.
A frontend és a backend kiadását össze kell hangolni; új környezeti változó nem kell.

## Ellenőrzés

```sh
node --test scripts/i18n.test.cjs
node e2e/node_modules/@playwright/test/cli.js test -c e2e/playwright.contract.config.ts personal-programs guided-tour
```

A böngészőtesztek saját Angular szervert és mockolt API-t használnak, desktop és
mobil nézetben futnak; nem használnak éles fiókot vagy adatbázist.
A guide teszt a teljes szerepkörönkénti útvonalat, mindhárom nyelvet és az írási
kérések hiányát is ellenőrzi. A backend adatmegőrzési és migrációs ellenőrzései
külön, elkülönített PostgreSQL-adatbázisban futnak.
