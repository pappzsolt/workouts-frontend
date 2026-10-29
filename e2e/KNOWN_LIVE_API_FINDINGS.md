# Valódi API-s Playwright-futás megállapításai

Dátum: 2026. október 29. A javítás és a teljes regressziós ellenőrzés lezárva.

## Javítva: asztali KÉSZ-kattintás és automatikus mezőmentés

A javítás előtt a következő tényleges böngészős tesztek ugyanazon jelenségen álltak meg:

- `user-journey-real.spec.ts`: automatikus továbblépés a következő gyakorlatra.
- Ugyanott: két egymást követő edzés és korábbi teljesítmény.
- Ugyanott: önálló edzés → teljesítés → sablon/ismétlés teljes folyamata.

Reprodukció: egy teljesítetlen sorozatnál tényleges ismétlés és súly kitöltése,
mezőből kilépés, majd a KÉSZ gomb megnyomása. A teszt külön ellenőrzi az
automatikus mezőmentés valódi HTTP-válaszát is.

**Hálózati bizonyíték:** a trace-ben a
`PATCH /api/exercises/user-workouts/sets/completed` kérések sikeres 200-as választ
kapnak, de mindegyik `completed:false` állapotot küld. A KÉSZ kattintásból várt
`completed:true` kérés nem indul el, így az edzés nem teljesül és a továbblépés
sem történhet meg. A szerver a kapott állapotot helyesen tárolja.

A gyökérok a csendes mezőmentés visszajelzés-kezelése volt. A blur-hívások
`showSuccessMessage=false` értékkel indultak, de a mentés induláskor mégis törölte
a meglévő üzenetet, majd a szerver sikerüzenete ismét megjelenítette a blokkot.
Ez elmozdíthatta a gombot lenyomás és felengedés között.

Az `ExerciseSetSaves` most tiszteletben tartja a csendes módot: az automatikus
mentés nem rendezi át a visszajelzést. Az explicit KÉSZ művelet továbbra is törli
az előző visszajelzést és kiírja az eredményt; a mentési hibák csendes módban is
megjelennek. A kérésadatok, mentési sor, jogosultságok, teljesítési állapot,
pihenőidőzítő és továbblépési feltételek nem változtak.

A három korábban hibázó folyamat és az új, mezőből közvetlenül a KÉSZ gombra
kattintó regressziós eset asztalon és mobilon egyaránt sikeres: **8/8**.
Az új közvetlen kattintási eset nem vár előzetes mentésre. Nincs `force`
kattintás, automatikus újrakattintás, kihagyás vagy mesterséges API-válasz.
Mind az **533 frontend-egységteszt** sikeres, köztük a csendes visszajelzés,
a hibajelzés és az explicit újrapróbálás új regressziós esetei.

## Javított tesztkörnyezet és tesztelvárások

- Az Angular szerver most a frontend gyökeréből indul. Az `e2e` könyvtárból
  indítva a Tailwind forrásmintái nem találták a komponenseket, ezért a felület
  hiányos stílusokkal jelent meg. A tesztindítás javítása után a mobil ügyfél-
  szerkesztés is sikeres; az alkalmazás CSS-forrása nem módosult.
- Program átnevezése előtt a teszt megvárja az eredeti név API-ból betöltött
  értékét. Ez kizárja, hogy a kezdeti betöltés a teszt kitöltésével essen egybe.
  A javított eset mindkét nézetben sikeres.
- Saját program importálása után a teszt a céloldal névmezőjének értékét vizsgálja,
  nem az oldal szövegtartalmát. Az input értéke nem része a `textContent`-nek.
  A pontosított importmegnyitási mátrix mind a 12 változata sikeres.

## Futtatási bizonyítékok

- Teljes frontend-egységteszt-csomag: **533/533 sikeres**.
- Korábban hibázó három folyamat és közvetlen KÉSZ-kattintás, két nézetben:
  célzottan **8/8 sikeres**.
- Teljes, egybefüggő asztali és mobil valódi API-s Playwright-futás:
  **254/254 sikeres**, nulla bukás, kihagyás, flaky vagy futtatókörnyezeti hiba.
- TypeScript-ellenőrzés és `git diff --check`: sikeres.

A 254 ellenőrzés 109 új forgatókönyvet jelent két nézetben, valamint 36 korábbi
regressziós esetet. A javítás előtti 244-es futás 239 sikeres és 5 sikertelen esetet
jelzett; a két pontatlan tesztelvárás és az alkalmazáshiba javítása után már a
fenti teljes csomag is sikeres.

A legutóbbi teljes futás HTML- és JSON-riportja: `live-api-report/index.html`,
illetve `live-api-results/results.json`. A teljes/célzott futások, az egységtesztek
és a javítás előtti futás naplója, valamint a gépi összesítés:
`live-api-results/verification/`.
