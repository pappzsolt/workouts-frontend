# Kiegészítő frontend hibavizsgálat – 2026. október 23.

**Javítási állapot:** az 1. és 2. pont javítva. A sorozatmentés az elküldött értékek pillanatképét rögzíti; a közben beírt változtatások mentetlenek maradnak, és megakadályozzák az automatikus továbblépést. Az ügyfélváltás megszakítja a régi kontextus kéréseit, az ügyféláttekintő újratöltése az előző áttekintőkérést is megszakítja, a régi adatok és a kiosztási/visszavonási megerősítések pedig törlődnek. Ez a 3. pontban reprodukált, ügyfélváltás után megmaradó visszavonási állapotot is megszünteti. A korábbi jelentésben külön jelzett párhuzamos visszavonási kattintások elleni védelem nem része ennek a javításnak. A 10 új regressziós teszt sikeres; a teljes csomag 215/215 sikeres. A production build és a build fordításainak ellenőrzése sikeres. Az alábbiak az eredeti hibaleírások.

Három további hibát célzott, ideiglenes böngészős diagnosztikai teszttel reprodukáltam. A tesztek a jelenlegi hibás állapot kialakulását igazolták; nem regressziós tesztek a helyes működésre. Az ideiglenes tesztet az alkalmazás forrásai közül eltávolítottam. Az eredeti hibakeresési körben alkalmazáskódot nem módosítottam; az utólag kért javításokat a fenti állapotjelzés tartalmazza.

1. **P1 – Mentés közben beírt új sorozatértékek tévesen mentettnek jelölődnek.**
   - Hely: `src/app/components/coach/coach-client-detail/coach-client-detail.component.ts:523–528`; szerkeszthető mezők: a hozzá tartozó HTML `:231` környéke.
   - Reprodukció: a célismétlés 10-ről 15-re módosul, elindul a mentés. A válasz előtt az edző 20-ra írja át a mezőt; a mezők mentés közben is szerkeszthetők. A szervernek küldött kérésben 15 szerepel, a sikeres válasz után a `row.original = this.values(row)` már a 20-at rögzíti mentett értékként. A `dirty` jelző hamis lesz, a felület sikeres mentést mutat, új kérés 20-szal nem történt.
   - Következmény: a felület és a szerver eltérő előírást tartalmaz, miközben a mentés gomb nem jelez további változtatást.
   - Javítás: a ténylegesen elküldött értékek pillanatképéből frissíteni az `original` mezőt, így a közben beírt módosítás mentetlen marad; alternatíva a teljes szerkesztés következetes zárolása a mentés idejére.

2. **P1 – Ügyfélváltásnál a régi ügyfél válasza összekeverheti a megjelenített személyt és a műveletek célját.**
   - Hely: `src/app/components/coach/coach-client-detail/coach-client-detail.component.ts:151–182`.
   - Feltétel: az Angular ugyanazt a `clients/:userId` komponenspéldányt használja új ügyfélazonosítóval. A hiba ilyen paraméterváltást szimuláló tesztben bizonyított; nem állítom, hogy minden ügyféllistán keresztüli váltás megtartja a komponenst.
   - Reprodukció: A ügyfél lekérése elindul, az útvonal B-re vált. B válasza megjön, majd A régi `getOverview()` válasza. A `userId` B azonosítója marad, de a `client` mező már A adatait tartalmazza. A korábbi javítás a programbetöltést állítja le, ezt az ügyféláttekintő-kérést nem.
   - Következmény: eltérhet a névvel megjelenített ügyfél és a kiosztási/visszavonási kérésekben használt ügyfélazonosító.
   - Javítás: ügyfélazonosítóhoz kötött `switchMap` vagy megszakítás és kontextusellenőrzés; váltáskor az előző ügyféladatok és a kapcsolódó UI-állapotok törlése.

3. **P1 – Az előző ügyfélnél megnyitott visszavonási megerősítés az új ügyfél programját vonhatja vissza.**
   - Hely: `src/app/components/coach/coach-client-detail/coach-client-detail.component.ts:151`, `:695–709`; HTML `:343–352`.
   - Feltétel: azonos komponenspéldányon belüli ügyfélváltás, a két ügyfélhez ugyanaz a program van kiosztva.
   - Reprodukció: A ügyfélnél a 99-es program visszavonási megerősítése megnyílik. Az útvonal B-re vált; a `revokeProgramId` továbbra is 99. A megerősítés B ugyanazon programjánál is megjelenik. A `confirmRevoke()` a 99-es programot az aktuális `this.userId`, vagyis B azonosítójával törli.
   - A diagnosztikai tesztben a tényleges szolgáltatáshívás `revokeProgram(99, 2)` volt, miközben a megerősítés az 1-es ügyfélnél indult. Ehhez nem kell későn érkező HTTP-válasz: szinkron ügyfélbetöltésekkel is reprodukálható.
   - Javítás: a megerősítés célját `{userId, programId}` párral rögzíteni, ügyfélváltáskor törölni, és a végrehajtás előtt ellenőrizni a célazonosságot. A hasonló kiosztási és mentetlen navigációs állapotokat is érdemes ugyanígy ügyfélhez kötni.

Ellenőrzés: a három diagnosztikai teszt FirefoxHeadless alatt lefutott, mindhárom a leírt hibás állapotot igazolta. A backendhez nem küldtem módosító kéréseket; a szolgáltatásválaszokat vezérelt tesztadatok helyettesítették. A legutóbbi teljes tesztcsomag zöld állapota önmagában nem fedi ezeket az eddig nem tesztelt eseteket.

A korábbi jelentésben szereplő, még nem javított tételek külön továbbra is fennállnak: elrejtett kiosztásbetöltési hiba, új gyakorlat indokolatlan workoutazonosító-hibája, ügyféladatlap visszavonásának párhuzamos indíthatósága és a gyakorlatválasztó hatástalan debounce-a. Ezeket nem számoltam új találatnak.
