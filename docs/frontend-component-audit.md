# Frontend komponensegységesítési audit

Dátum: 2026-10-07. Statikus forráskód-ellenőrzés a jelenlegi munkapéldányon, az előző felületi módosításokkal együtt. A felmérés a `src/app` összes, 65 külön HTML-sablonjára, a TypeScriptbe írt inline sablonokra és a közös komponensek API-jára terjed ki. Böngészős ellenőrzés és komponensátállítás nem része ennek az auditnak.

A számlálás sablonbeli előfordulásokat jelent, nem futás közbeni DOM-elemeket: az `ngFor` egyetlen előfordulásnak számít. A közös `shared/components` építőelemek saját natív elemei kimaradnak; a `shared/user`, `shared/coach`, `shared/programs` sablonjai szerepelnek. A régi vagy nem bekötött sablonok is forráskódként szerepelnek, ezért a darabszám nem azonos az aktív képernyők darabszámával.

## Jelenlegi állapot

- 113 natív `input`, 17 `textarea`, 9 `button`, 2 `table` és 0 natív `select` az építőelemek saját sablonjain kívül.
- Az inputok megoszlása: 44 text, 28 number, 12 date, 9 password, 8 checkbox, 7 email, 2 datetime-local, 1 radio és 2 explicit típus nélküli mező.
- Már 124 `app-form-field`, 87 `app-button`, 81 `app-message`, 20 `app-card`, 18 `app-select`, 16 `app-search` és 10 `app-pagination` előfordulás van ugyanebben a körben.
- A legtöbb alapműveleti gomb, listakereső és lenyíló már közös komponenst használ. A legnagyobb megtakarítást a mezők megjelenésének és állapotainak központosítása adná.

## Az 1. pont megvalósítása

Az 1. kategória cseréi elkészültek:

- Kereshető felhasználóválasztó az admin felhasználószerkesztőben; kereshető programválasztó a hozzárendelésnél; kereshető AppSelect az admin coach-szerkesztőben.
- FormField a shared user/coach/role/program választók és a hozzárendelés címkéihez, valamint a coach-/sorozatszerkesztő és a felhasználói gyakorlatrészletek egyszerű mezőihez. A tényleges inputokon explicit id van; a checkbox/radio címkézése megmaradt.
- A napló oldalméretválasztója a közös lapozóban van; a korábbi pageSizeChange handler és a backend oldalszámozása megmaradt.
- Közös Message a napló, coach-szerkesztő, shared workout/exercise boardok betöltési és a gyakorlatmodal üres állapotaihoz.
- Outlined AppCard a naplótáblázat, a kompakt workout/exercise board-listák és a gyakorlatmodal statikus listakonténereihez. A natív táblázat, checkboxok, események, szűrés és lapozás megmaradtak.
- AppSelect javítás: később érkező opcióknál frissül a kiválasztott címke, és az opciók frissítése nem írja felül a keresést. Bezáráskor a kiválasztott érték áll vissza.
- Az admin szerkesztési e2e teszt a keresés után explicit kiválasztást végez. Új böngészős regressziós tesztek ellenőrzik a forms validációt, numerikus értékeket, blur/submit mentést, pontos felhasználóválasztást, programleírás szerinti keresést és a napló page-size kérését.

Ellenőrzés a megvalósítás után: 124 komponens-regressziós teszt sikeres valódi headless böngészőben; development build és Angular-sablonellenőrzés sikeres; a módosított admin e2e teszt típusellenőrzése sikeres; theme audit: 320 forrásfájl, 0 hiba. Élő backenddel a DB-t is használó e2e tesztet nem futtattam. A két dashboard create-teszt hiányzó Router/Translate providerét pótoltam, és a választótesztet a meglévő Material animációs tokenjével konfiguráltam új csomag nélkül.

A további kategóriák nagyobb komponensbővítései nem részei ennek az átállításnak. Az alábbi darabszámok és leltár az audit eredeti állapotát rögzítik.

## 1. Meglévő komponensekkel kiváltható, új API nélkül

| Feladat | Meglévő komponens | Konkrét hely | Feltétel / teendő |
| --- | --- | --- | --- |
| Felhasználókereső és választó összevonása további oldalakon | `UserSelectComponent` kereshető módban | `admin-dashboard/operations/user-edit/user-edit.component.html:26` | `[searchable]="true"`; gépeléskor nem történik automatikus kiválasztás, csak explicit választáskor. Ezt a működésváltozást az oldalhoz kell igazítani. |
| Programkereső és választó összevonása | `CoachProgramSelectComponent` kereshető módban | `coach-dashboard/operations/assign-program/assignprogram.component.html:43` | `[searchable]="true"`; a programleírás szerinti keresés is megmarad. |
| Keresés az előre betöltött coach-listán | `AppSelectComponent` | `admin-dashboard/operations/coach-edit/coach-edit.component.html:53` | `[searchable]="true"` a már meglévő options/valueChange bekötés mellett; itt nincs szükség új adatbetöltő komponensre. |
| Egyszerű mezőcímkék és mezőkonténerek | `FormFieldComponent` | `user-workout-exercise-manager.component.html:114,203`; `user-exercises-detail.component.html:257,278,310`; shared user/coach/role választók | `labelKey` és `controlId`; az inputnak tényleges, egyedi id kell. Az inline checkbox-címkéket nem ugyanígy kell cserélni. A wrapper önmagában nem egységesíti az input stílusát. |
| Külön oldalméretválasztó beolvasztása a lapozóba | `PaginationComponent` | `admin-dashboard/operations/login-audit-logs/login-audit-logs.component.html:206,223` | A `showPageSize` bekapcsolható; a jelenlegi pageSizeOptions és esemény már rendelkezésre áll. A külön label/app-select blokk elhagyható. Az elhelyezés a lapozóhoz kerül. |
| Egyszerű tájékoztató, üres és betöltési szövegek | `MessageComponent` | `login-audit-logs.component.html` loading/noLogs blokkok; `program-exercise-dialog.component.html` noExercises blokk | Akkor közvetlen csere, ha megfelel az üzenetdoboz meglévő kinézete. A nagyobb üres állapot vagy spinner külön tétel lent. Mezővalidációhoz jelenleg nem teljes értékű helyettesítő. |
| Egyszerű, statikus bekeretezett dobozok | `AppCardComponent`, `variant="outlined"` | `login-audit-logs.component.html` eredménykonténer; shared coach boardok listakonténerei | A belső tartalom kivetíthető, a padding maradhat belül. Űrlaphoz a `form` elem, szemantikus szekcióhoz a `section` megőrzendő. A jelenlegi overflow-hidden megfelelő legyen. |

Az utolsó két sor opcionális vizuális egyszerűsítés: a natív HTML helyett több komponens önmagában nem cél. Az azonos megjelenésű, többször ismételt felületeket érdemes összevonni.

## 2. Meglévő komponens bővítése vagy a használó oldal átalakítása szükséges

| Meglévő elem | Hol látszik a hiány? | Szükséges változtatás |
| --- | --- | --- |
| `FormFieldComponent` | Admin coach létrehozásban négy külön validációs szöveg; sok űrlapban ismételt mezőállapotok | `hint`, `error`, hibaazonosító és megjelenítési állapot; kapcsolat az input `aria-describedby` és `aria-invalid` attribútumaival. A `required` input most csak csillagot rajzol, nem validál. |
| `AppSelectComponent` Angular forms integrációja | A komponens belső ngModelje standalone; a `program-form` reactive formot használ | Opcionális `ControlValueAccessor` támogatás, touched/disabled állapot továbbítása. Jelenlegi `value/valueChange` API megőrzendő. A ma működő kézi bekötéshez nincs szükség CVA-ra. |
| `AppSelectComponent` betöltött opcióinak megjelenítése | Kereshető mód, előre beállított azonosító és később érkező opciók / nyelvváltás | A kijelzett címke frissítését is kezelni kell, nem csak a value változását. A folyamatban lévő keresést nem szabad minden options-tömbfrissítéskor törölni. |
| Választó wrapper komponensek | `shared/coach/coach-select.component.ts`; shared user/role/program címkék | A coach-választóban kereshető mód továbbítása és a külön kereső opcionális elhagyása. Egyedi, konfigurálható id a fix coachSelect/userSelect/roleSelect azonosítók helyett, ha több példány kerül egy oldalra. Egységes címkézés a FormFielddel. |
| `AppButtonComponent`, összetett műveleti gombok | Programépítő két natív műveleti kártyája, `coach-program-builder-workouts.component.html:175,202` | Tartalomkivetítés már van, ezért az alap kattintás kiváltható; a pontos kártyamegjelenéshez külön megjelenési mód szükséges, amely nem kényszeríti rá a normál gomb paddingját, hátterét és méretét. `data-testid`/ARIA értékek továbbítása a tényleges gombra. |
| `AppButtonComponent`, kiválasztható sorok | `coach-workout-edit.component.html:314`; `user-workout-exercise-manager.component.html:152`; naptár `:152,202` | Egységes sor-megjelenés vagy a lent javasolt önálló selection-row komponens. A meglévő `active`/`completed` gombszínek nem azonosak a sorok jelenlegi állapotkezelésével. A CSS-szelektorok és az eseménykezelők is változnak. |
| `DashboardActionComponent` | Programépítő műveleti kártyái hasonló szerepűek, de más megjelenésűek | Ha ezt használjuk az AppButton-bővítés helyett: compact/horizontal elrendezés, leírás, disabled, expanded és controls támogatás. Nem kell mindkét komponenst párhuzamosan ugyanarra bővíteni. |
| `AppCardComponent` | Ismétlődő fejléces és űrlapos panelek | Opcionális padding, fejléc/művelet helyek, hover kikapcsolása, overflow szabályozása. A forms és section szemantika ne vesszen el. A sima div-es díszítőkonténereket nem kell mind átalakítani. |
| `ConfirmDialogComponent` | A közös komponens címe az edzéssorozat-törléshez kötött; több más törlési oldal is ezt használja | Általános `title`, saját title/description id, fókuszcsapda, nyitáskori fókusz és bezáráskori visszaállítás. Az Escape már működik. Teljes űrlapos modalnak továbbra sem megfelelő. |
| `MessageComponent` | Inline formhibák `role="alert"` attribútummal; eltérő nagyobb üres/betöltési panelek | Opcionális compact megjelenés és role/aria-live támogatás. A mezőhibákhoz célszerűbb a FormField integráció; üzleti státuszhoz badge kell. |
| `PaginationComponent` | `pages` az összes oldalszámot előállítja; oldalfelirat coachExercisesBoard kulcshoz kötött | Nagy adatmennyiségnél ablakos oldalszámok és ellipszis; általános fordítási kulcs. A jelenlegi alap lapozóhasználathoz ezek nem előfeltételek. |
| `ProgramDetailsFormComponent` | Új program, programszerkesztő, programépítő és régi program-form hasonló mezői | A már meglévő tisztán input/output alapú programűrlap általánosítása create/edit módra, validációval; a mentési/API logika maradjon a szülőben. A szolgáltatást hívó ProgramFormComponent nem közvetlen csere. A reactive form és a builder állapotmodell egyeztetést igényel. |

A `program-form.component.html` `formControlName` elemei mellett helyben nincs `[formGroup]` bekötés, és a selectorhoz nem találtam sablonbeli használatot. Újrafelhasználás előtt tisztázandó az aktív szerepe és a formcsoport bekötése; nem érdemes erre alapozni az egységesítést automatikusan.

## 3. Új közös komponens vagy direktíva indokolt

| Javaslat | Érintett terület | Miért nem oldja meg a jelenlegi készlet? | Prioritás |
| --- | --- | --- | --- |
| `appInput` stílusdirektíva; alternatívaként `AppInputComponent` | Login/jelszó, admin create/edit, user/coach profil, coach program/workout/exercise űrlapok, builder, sorozatok | A FormField csak címkét/konténert ad. Az inputok stílusai, readonly/disabled/invalid állapotai ismétlődnek. A direktíva megtartja a natív ngModel/formControlName validátorait és típuskezelését. Ha komponens kell, CVA és validátortovábbítás is szükséges. | Magas |
| `appTextarea` direktíva vagy `AppTextareaComponent` | 17 megjegyzés/leírás/specializáció mező | A multiline mezők rows/resize és magasságviselkedése eltér az inputtól; a form integráció maradjon meg. | Magas |
| `AppCheckboxComponent` és egységes rádió vezérlő / direktíva | 8 checkbox: shared workout/exercise boardok, user-multi-select, edzés láthatóság, gyakorlat aktív állapot, sorozat kész állapot; 1 radio a program-boardon | A Select egyértékes lenyíló, a FormField nem checkbox sor. Szükséges checked/disabled, label, id, value-change; igény szerint indeterminate. A mai Event.target.checked függő handlerbekötéseket is át kell alakítani. | Magas |
| `AppDialogComponent` általános modal-keret | `workout-copy-dialog`, `program-exercise-dialog`, `assign-workouts-exercises` exercise selector | Három külön backdrop, fejléc, görgethető tartalom és footer. A ConfirmDialog egyszerű megerősítés. Új keret tartalomkivetítéssel, mérettel, title kapcsolattal, Escape/backdrop viselkedéssel és fókuszkezeléssel; CDK Dialog használható alatta. | Magas |
| `AppBadgeComponent` | Audit accountType; member-search típus; program-statistics állapot; builder nap/számláló; userWorkouts darabszám | A rövid státuszcímke és számláló eltér az egész soros Message-től. Méret és szemantikus tónus legyen közös, az üzleti feltételek maradjanak a szülőben. | Közepes |
| `AppPageHeaderComponent` / `AppSectionHeaderComponent` | Mindhárom dashboard; admin oldalak; program/workout/exercise képernyők; user oldalak; builder fejlécek | Azonos cím + ikon + alcím + opcionális művelet minták sokszor ismétlődnek. A Card és DashboardAction más szerepű. A heading szint és align legyen konfigurálható. | Közepes |
| `AppTabsComponent` | `user-dashboard/operations/user-workouts/workouts.component.html:34` | A két natív gomb tablist/tab/tabpanel szemantikájú. AppButton nem továbbít role/aria-selected/tabindex attribútumokat, és nincs tab-billentyűzetkezelése. Önálló tabs indokolt, ha ezt máshol is használni tervezzük; jelenleg egy képernyő érintett. | Közepes |
| `AppLoadingComponent` / `AppEmptyStateComponent` | Workoutszerkesztő spinner; audit loading/noLogs; program-exercise-dialog üres lista; többi listanézet | Akkor éri meg, ha egységes nagyobb állapotblokk, ikon/spinner és opcionális művelet kell. Egyszerű szövegnél a Message már elég. | Közepes |
| `AppSelectionRowComponent` | Gyakorlatválasztás a workoutszerkesztőben és sorozatszerkesztőben; naptár eseménygombjai | Alternatíva az AppButton összetett sorokra bővítésére. Kivetített kezdőikon/sorszám, főszöveg, kiegészítés, jobb oldali státusz; active/disabled, jól definiált gomb- vagy választószemantika. Csak a valóban közös szerkezetet emelje ki. | Közepes |
| `AppTable` megjelenési direktívák vagy vékony táblakeret | `member-search.component.html` és `login-audit-logs.component.html` | Két külön natív táblázat ismétli a head/row/cell és overflow megjelenést. Kezdetben stílusdirektívák/tartalomkivetítés; konfigurációs adatgrid csak további igénynél. | Alacsony |
| Közös profil/adatmező-blokk | User new/edit/profile; coach new/edit/profile | Név, email, telefon, avatar, testsúly stb. ismétlődő csoportjai. Csak közös DTO/validáció tisztázása után; user és coach mezők nem mindenhol azonosak. API-hívásokat ne vigye magával. | Később |

Nem javaslok külön saját dátumválasztót a 12 date és 2 datetime-local mező miatt: az általános input stílus és a natív típus megőrzése elég. A naptár egészét, az üzleti edzéskártyákat, a menü navigációs linkjeit és az egy oldalon lévő workout/set steppert sem kell automatikusan generikus komponenssé alakítani.

## Javasolt sorrend

1. Közös input/textarea stílusdirektívák, FormField hiba/hint támogatás. Itt a legnagyobb az ismétlés és a legkisebb a működésváltás.
2. A már meglévő kereshető választók bekapcsolása a megfelelő további helyeken; coach wrapper támogatása. A gépelés és a kiválasztás maradjon külön esemény.
3. Checkbox/radio egységesítés és közös modal-keret.
4. Badge, oldal-/szekciófejléc, indokolt üres/betöltési állapotok.
5. Programűrlapok összevonása és szükség szerint összetett sorok/tabs; táblázatkeret csak ezután.

## Ellenőrzési szempontok az átállításkor

- Angular forms: a required/email/minlength/pattern/min/max/step, touched/dirty és a form érvényessége ne vesszen el; számmezőknél szám/null maradjon, ne puszta szöveg.
- Native submit, reset, autofocus/autocomplete és readonly/disabled viselkedés megőrzése.
- Label for/id párok, ARIA és fókuszkezelés a belső tényleges vezérlőhöz tartozzanak, ne csak az app-* hosthoz.
- Az e2e tesztek `data-testid` és input/change eseményekre épülő bekötéseit az új belső DOM-hoz kell igazítani.
- Az összetett kiválasztósoroknál az AppButtonra váltás nem lehet csak tagcsere: scoped CSS, grid/flex és eseményparaméterek is érintettek.

## Natív elemek fájlonkénti leltára

Minden útvonal a `src/app` könyvtárhoz relatív. A közös építőelemek saját sablonjai itt sem szerepelnek.

| Fájl | Input | Textarea | Button | Table |
| --- | ---: | ---: | ---: | ---: |
| [components/admin-dashboard/operations/coach-edit/coach-edit.component.html](../src/app/components/admin-dashboard/operations/coach-edit/coach-edit.component.html) | 5 | 1 | 0 | 0 |
| [components/admin-dashboard/operations/coach-new/coach-new.component.html](../src/app/components/admin-dashboard/operations/coach-new/coach-new.component.html) | 5 | 1 | 0 | 0 |
| [components/admin-dashboard/operations/login-audit-logs/login-audit-logs.component.html](../src/app/components/admin-dashboard/operations/login-audit-logs/login-audit-logs.component.html) | 3 | 0 | 0 | 1 |
| [components/admin-dashboard/operations/user-edit/user-edit.component.html](../src/app/components/admin-dashboard/operations/user-edit/user-edit.component.html) | 8 | 1 | 0 | 0 |
| [components/admin-dashboard/operations/user-new/user-new.component.html](../src/app/components/admin-dashboard/operations/user-new/user-new.component.html) | 7 | 1 | 0 | 0 |
| [components/admin-dashboard/operations/user-search/member-search.component.html](../src/app/components/admin-dashboard/operations/user-search/member-search.component.html) | 0 | 0 | 0 | 1 |
| [components/coach-dashboard/operations/coach-exercises/coach-exercise-edit/coach-exercise-edit.component.html](../src/app/components/coach-dashboard/operations/coach-exercises/coach-exercise-edit/coach-exercise-edit.component.html) | 16 | 3 | 0 | 0 |
| [components/coach-dashboard/operations/coach-exercises/coach-exercise-new/new-exercise.component.html](../src/app/components/coach-dashboard/operations/coach-exercises/coach-exercise-new/new-exercise.component.html) | 9 | 1 | 0 | 0 |
| [components/coach-dashboard/operations/coach-profile/coach-profile.component.html](../src/app/components/coach-dashboard/operations/coach-profile/coach-profile.component.html) | 5 | 1 | 0 | 0 |
| [components/coach-dashboard/operations/coach-program-builder/coach-program-builder-workouts.component.html](../src/app/components/coach-dashboard/operations/coach-program-builder/coach-program-builder-workouts.component.html) | 0 | 0 | 2 | 0 |
| [components/coach-dashboard/operations/coach-program-builder/program-details-form.component.html](../src/app/components/coach-dashboard/operations/coach-program-builder/program-details-form.component.html) | 4 | 1 | 0 | 0 |
| [components/coach-dashboard/operations/coach-program-builder/workout-copy-dialog.component.html](../src/app/components/coach-dashboard/operations/coach-program-builder/workout-copy-dialog.component.html) | 3 | 0 | 0 | 0 |
| [components/coach-dashboard/operations/coach-programs/coach-new-program/coach-new-program.component.html](../src/app/components/coach-dashboard/operations/coach-programs/coach-new-program/coach-new-program.component.html) | 4 | 1 | 0 | 0 |
| [components/coach-dashboard/operations/coach-programs/coach-program-edit/coach-program-edit.component.html](../src/app/components/coach-dashboard/operations/coach-programs/coach-program-edit/coach-program-edit.component.html) | 4 | 1 | 0 | 0 |
| [components/coach-dashboard/operations/coach-workouts/coach-workout-edit/coach-workout-edit.component.html](../src/app/components/coach-dashboard/operations/coach-workouts/coach-workout-edit/coach-workout-edit.component.html) | 4 | 1 | 1 | 0 |
| [components/coach-dashboard/operations/coach-workouts/coach-workout-new/new-workout.component.html](../src/app/components/coach-dashboard/operations/coach-workouts/coach-workout-new/new-workout.component.html) | 3 | 1 | 0 | 0 |
| [components/coach-dashboard/operations/program-form/program-form.component.html](../src/app/components/coach-dashboard/operations/program-form/program-form.component.html) | 5 | 1 | 0 | 0 |
| [components/coach-dashboard/operations/user-workout-exercise-manager/user-workout-exercise-manager.component.html](../src/app/components/coach-dashboard/operations/user-workout-exercise-manager/user-workout-exercise-manager.component.html) | 8 | 0 | 1 | 0 |
| [components/forgot-password/forgot-password.component.html](../src/app/components/forgot-password/forgot-password.component.html) | 1 | 0 | 0 | 0 |
| [components/login/login.component.html](../src/app/components/login/login.component.html) | 2 | 0 | 0 | 0 |
| [components/reset-password/reset-password.component.html](../src/app/components/reset-password/reset-password.component.html) | 2 | 0 | 0 | 0 |
| [components/shared/coach/coach-exercises-board/coach-exercises-board.component.html](../src/app/components/shared/coach/coach-exercises-board/coach-exercises-board.component.html) | 2 | 0 | 0 | 0 |
| [components/shared/coach/coach-program-board/coach-program-board.component.html](../src/app/components/shared/coach/coach-program-board/coach-program-board.component.html) | 1 | 0 | 0 | 0 |
| [components/shared/coach/coach-workouts-board/coach-workout-board.component.html](../src/app/components/shared/coach/coach-workouts-board/coach-workout-board.component.html) | 2 | 0 | 0 | 0 |
| [components/shared/user/user-multi-select.component.ts](../src/app/components/shared/user/user-multi-select.component.ts) | 1 | 0 | 0 | 0 |
| [components/user-dashboard/operations/user-exercises/user-exercises-detail/user-exercises-detail.component.html](../src/app/components/user-dashboard/operations/user-exercises/user-exercises-detail/user-exercises-detail.component.html) | 2 | 1 | 0 | 0 |
| [components/user-dashboard/operations/user-profile/user-profile.component.html](../src/app/components/user-dashboard/operations/user-profile/user-profile.component.html) | 7 | 1 | 0 | 0 |
| [components/user-dashboard/operations/user-workouts/workouts.component.html](../src/app/components/user-dashboard/operations/user-workouts/workouts.component.html) | 0 | 0 | 2 | 0 |
| [components/user-dashboard/operations/user-workouts-calendar/user-workouts-calendar.component.html](../src/app/components/user-dashboard/operations/user-workouts-calendar/user-workouts-calendar.component.html) | 0 | 0 | 2 | 0 |
| [layouts/default-layout/layout.component.html](../src/app/layouts/default-layout/layout.component.html) | 0 | 0 | 1 | 0 |
