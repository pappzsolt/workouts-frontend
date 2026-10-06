# Stílus- és színellenőrzés

Az ellenőrzés 320 CSS-, HTML- és TypeScript-forrásfájlt fed le a `src` könyvtárban. A tesztfájlok és a be nem töltött `src/_old.css` kimaradnak az aktív felület ellenőrzéséből. A megállapítások forráskód- és CSS-fordítási ellenőrzésen alapulnak; böngészős képernyőkép-összehasonlítás nem történt.

## Elvégzett átállítások

| Terület | Korábbi eltérés | Változás | Fájl |
| --- | --- | --- | --- |
| Közös paletta | A CSS-változók kézzel felsorolt árnyalatokat exportáltak | A Tailwind-plugin minden szemantikus palettát és árnyalatot automatikusan exportál | `tailwind.config.js` |
| Alapértelmezett keret és fókusz | A színosztály nélküli keret, fókuszgyűrű és gyűrűeltolás Tailwind-alapszínt használhatott | `surface.300`, `primary.500`, `white` az alapértelmezés | `tailwind.config.js` |
| Globális CSS és Material | A paletta és a változók kapcsolata két helyen volt felsorolva | A kézi `--app-*` lista megszűnt; a Material M3-színszerepek továbbra is a generált palettára hivatkoznak | `src/styles.css` |
| Megerősítő ablak | Beégetett RGBA háttér, fekete árnyék és fehér tartalékérték | `--app-overlay`, `--app-shadow-color`, `--app-white`; a háttér és az árnyék színe külön állítható | `src/app/components/shared/components/confirm-dialog/confirm-dialog.component.css` |
| Edzés- és sorozatszerkesztő | Az oldalárnyék közvetlenül a szövegszínhez kapcsolódott | Az általános árnyékszínhez kapcsolódik | `src/app/components/coach-dashboard/operations/user-workout-exercise-manager/user-workout-exercise-manager.component.css` |
| Közös kártya | Az alap kártya vastag zöld kerete és zöld háttere eltért a legtöbb paneltől | Semleges felület, vékony keret, enyhe árnyék; kiemelés a hover állapotban | `src/app/components/shared/components/app-card/app-card.component.html` |
| Közös választó | Kisebb lekerekítés, eltérő fókuszárnyalat | `rounded-xl`, legalább 44 px magasság, `primary.500` fókusz; illeszkedik a keresőhöz | `src/app/components/shared/components/app-select/app-select.component.ts` |
| Új gyakorlat űrlap | Eltérő lekerekítés, fókusz és checkbox-szín | A közös mezők lekerekítése, magassága és fókusza; elsődleges checkbox-szín | `src/app/components/coach-dashboard/operations/coach-exercises/coach-exercise-new/new-exercise.component.html` |
| Automatikus ellenőrzés | Nem volt ellenőrzés az újonnan beégetett színekre | Forrásaudit és valódi Tailwind/PostCSS-fordításon alapuló teszt | `scripts/check-theme.cjs`, `scripts/theme.test.cjs`, `package.json` |

## Átnézett fő felületek

| Felület / komponens | Színek forrása | Megállapítás |
| --- | --- | --- |
| Coach, admin és user dashboard | `primary`, `surface`, `content`, illetve szemantikus műveletszínek | Közös navigáció és dashboard-műveleti komponens; a színek konfigurációból származnak |
| Alap- és bejelentkezési elrendezések | `primary`, `surface`, `content`, `white` | Egységes semleges felületek és elsődleges navigációs kiemelés |
| Belépés és jelszóűrlapok | `surface`, `content`, `primary`, `delete` | A színek központiak, az űrlapok megjelenése összhangban van |
| Admin felhasználó- és coach-kezelés | Szemantikus Tailwind-osztályok; Materialnál `--mat-sys-*` → `--app-*` | A szerepkörválasztó Material marad, de a színe ugyanahhoz a palettához kötődik |
| Coach programok, edzések és gyakorlatok | Szemantikus Tailwind-osztályok | Közös gombok, kereső és választók; az új gyakorlat mezőinek eltérése javítva |
| Programépítő és hozzárendelések | Szemantikus Tailwind-osztályok | Állapot- és műveletszínek központiak; eltérő rácsok a funkcióhoz igazodnak |
| Edzés- és sorozatszerkesztő | Generált `--app-*` változók és Tailwind-osztályok | Saját CSS-es elrendezés, de a színek és az általános árnyék központiak |
| User programok, edzések, gyakorlatok, statisztikák | Szemantikus Tailwind-osztályok, közös kártyák | A közös kártya semleges felületre átállítása mindegyik használati helyet érinti |
| Edzésnaptár | `primary`, `success`, `surface`, `content` | Az elkészült edzések állapotszíne szándékos; minden szín konfigurált |
| `AppButtonComponent` | Műveleti paletták, `primary`, `surface`, `content` | A normál, keretes, háttér nélküli és aktív változatok is központi színeket használnak |
| `AppSearchComponent`, `AppSelectComponent`, mezőhibák | `primary`, `surface`, `content`, `delete` | Egységes színkezelés; a választó méretezése és fókusza igazítva |
| Üzenetek és lapozók | `success`, `info`, `delete`, `primary`, `surface`, `content` | Az eltérő színek a jelentést jelzik, és mind a konfigurációból jönnek |
| Phosphor- és Lucide-ikonok | Örökölt szín / `currentColor` | Nem tartalmaznak saját beégetett felületszínt |
| `src/_old.css` | Régi, nem használt stylesheet | Nincs importálva vagy az Angular buildhez hozzáadva; nem vezérli a felületet |

## Hol módosíthatók a színek?

A `tailwind.config.js` palettáit módosítsd, majd indítsd újra a fejlesztői szervert vagy készíts új buildet. Ez buildidőben működik, nem futás közbeni témaváltás.

| Konfiguráció | Feladat |
| --- | --- |
| `primary` | Elsődleges műveletek, fejléc, fókusz, aktív állapot |
| `surface` | Semleges háttér és keretek |
| `content` | Szövegek és halvány szövegek |
| `white` | Világos panelek és a meglévő fehér feliratok |
| `save`, `success` | Mentés és sikeres/befejezett állapot; jelenleg a `primary` palettára mutatnak |
| `edit`, `info` | Szerkesztés és tájékoztató állapot; jelenleg a `blue` palettára mutatnak |
| `search`, `add`, `sort`, `pagination`, `warning`, `delete` | Keresés, hozzáadás, rendezés, lapozás, figyelmeztetés és törlés/hiba |
| `overlay` | Takaróréteg alapszíne |
| `shadow` | Általános árnyékok alapszíne; a szándékosan színezett Tailwind-árnyékok a saját palettájukat követik |

Az aliasok miatt a `primary` objektum módosítása jelenleg a `save` és `success` színeit is módosítja. Ha külön színt szeretnél, ezekhez külön palettát adj meg ugyanebben a fájlban. Ugyanez vonatkozik az `edit`/`info`, `surface`/`content` és `sort`/`pagination` párokra.

A saját képek, fotók és a böngésző natív dátumválasztójának belső megjelenése nem Tailwind-felületszín; ezek nem színezhetők át ezzel a palettával.

## Ellenőrzés

- `npm run check:theme`: közvetlen színértékek, hiányzó CSS-változók és palettaosztályok ellenőrzése.
- `npm run test:theme`: CSS-fordítás és annak bizonyítása, hogy egy konfigurációmódosítás átjut az osztályokba és változókba, új árnyalat esetén is.
- `ngc -p tsconfig.app.json`: Angular-sablonok és alkalmazáskód fordítása.
