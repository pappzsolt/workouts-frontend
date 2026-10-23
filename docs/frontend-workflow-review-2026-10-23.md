# További frontend munkafolyamat-hibák – 2026. október 23.

**Javítási állapot:** mindhárom pont javítva. A program alapadatainak mentése utáni újratöltés megőrzi a kiválasztott nap módosított előírásait és az új edzés piszkozatát; a piszkozatot tartalmazó napot eltávolító rövidítés tiltott. A sorba állított sorozatmentések megosztott, szerver által visszaigazolt teljesítési állapotból szinkronizálják a pihenőidő célját; a normál mezőmentés nem indít új időzítőt. A nem támogatott „Kész” jelölőnégyzet és a létrehozási modell felesleges done alapértéke eltávolítva. A 12 új regressziós teszt sikeres, a teljes csomag 227/227 sikeres. A production build és a build fordításainak ellenőrzése sikeres. Az alábbi leírások az eredeti hibákat rögzítik.

A három alábbi hibát ideiglenes FirefoxHeadless diagnosztikai tesztek igazolták. Ezek a hibás viselkedés reprodukciói voltak, nem a helyes működést igazoló regressziós tesztek. Az eredeti hibakeresési körben az alkalmazáskódot nem módosítottam; a diagnosztikai tesztet eltávolítottam a források közül.

1. **P2 – A sorozat sikeres teljesítése után elmaradhat a pihenőidő megjelenítése.**
   Hely: `src/app/components/user-dashboard/operations/user-exercises/user-exercises-detail/user-exercises-detail.component.ts:341–347`.
   A felhasználó teljesítettnek jelöli a sorozatot, majd a mentés válasza előtt módosítja például a tényleges súlyt, és a blur új mentést állít sorba. Az első, teljesítést mentő válasz már nem a legutóbbi mentéshez tartozik, ezért nem hívja a `selectLastCompletedTimer()` metódust. A második, adatmezőt mentő kérésnél a `completed` függvényparaméter undefined, ezért az sem hívja. Mindkét mentés sikeres, a sorozat teljesített, de a `restTimerSetId` null marad, így az időzítő nem kap sorozatazonosítót. Következmény: a pihenőidő és az ahhoz kötött automatikus továbblépés nem indul el a felületen. A teszt nem ellenőrizte az éles backend időzítőjét, kizárólag a frontend állapotát.
   Javítás: a legutóbbi sikeres mentésnél a megerősített teljesítési állapotból szinkronizálni az időzítő célját, a korábbi válaszok felülírása és a szerveroldali időzítő újraindítása nélkül.

2. **P1 – A program alapadatainak mentése eldobja a mentetlen gyakorlat-előírásokat.**
   Hely: `src/app/components/coach/coach-program-editor/coach-program-editor.component.ts:328–335`.
   A kiválasztott edzésnél a sorozatszám 3-ról 5-re módosul, majd az edző a program nevét is átírja, és a felső, programadatokat mentő gombra kattint. A `saveDetails()` nem ellenőrzi a `changedCount` értékét. A programadatok sikeres mentése után `loadProgram()` fut, amely a gyakorlatokat a szerver régi előírásaiból építi újra. A sorozatszám 3-ra áll vissza, a `changedCount` nulla lesz; az 5-ös értéket nem küldte el gyakorlatmentési kérés. Ez más kiváltó esemény, mint a korábban már javított napváltás.
   Javítás: programadatmentéskor megőrizni a gyakorlatpiszkozatokat vagy külön megerősítést kérni; a programnév mentése ne dobja el a másik szerkesztési terület adatait.

3. **P2 – Az új gyakorlat űrlapjának „Kész” jelölőnégyzete hatástalan.**
   Hely: `src/app/components/coach-dashboard/operations/coach-exercises/coach-exercise-new/new-exercise.component.html:176–186`, a komponens TypeScript-fájlja `:63–74`, valamint `src/app/services/coach/coach-exercises/coach-exercises.service.ts:130–145`.
   Az űrlap módosítja a `newExercise.done` mezőt, de a komponens által összeállított payload nem tartalmazza. A szolgáltatás `ExerciseRequest` payloadjában és a jelenlegi frontend DTO-szerződésben sincs ilyen mező. A diagnosztikai tesztben a bepipált true érték ellenére a szolgáltatásnak átadott payload `done` értéke undefined volt.
   Javítás: a nem támogatott jelölőnégyzet eltávolítása, vagy a mező teljes frontend/backend támogatásának külön megvalósítása. Pusztán a komponens payloadjának kiegészítése nem elég, mert a szolgáltatás újra összeállítja a kérést.

Ellenőrzés: 3/3 diagnosztikai próba sikeresen reprodukálta a leírt hibás viselkedést; valódi backendadatok módosítása nélkül. A korábban már jelentett, még nyitott hibákat nem számoltam új találatnak.
