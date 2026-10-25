# Önálló edzések kiegészítő regressziós tesztjei

A funkció feltöltése után külön tesztcsomag készült, production kód módosítása nélkül.

## Unit tesztek

A `PersonalProgramEditorComponent` további négy esete ellenőrzi:

- Ismétlési hibánál az eredeti adatok és az elindított állapot megmaradnak,
  a hibaüzenet látszik és a művelet újrapróbálható.
- Függő válasz alatt a dupla megerősítés egyetlen kérést küld, a kilépés blokkolt.
- Normál program és el nem indított standalone piszkozat nem ismételhető a felületen.
- A standalone route eleve pontosan egy rejtett, 1-es sorszámú edzésnapot inicializál.

## Desktop és mobil böngésző

A meglévő izolált `personal-programs.spec.ts` további négy forgatókönyve mindkét
nézetben fut, összesen nyolc új böngészős ellenőrzéssel:

- 503-as ismétlési hiba után az eredeti edzés zárolt marad, az újrapróbálás szerkeszthető
  új alkalomra navigál.
- Visszavont megerősítés nem indít kérést. Függő kérés alatt a megerősítés és a mégse
  gomb letiltott; pontosan egy ismétlés történik.
- Az angol egyszerűsített felület helyes címeket mutat, elrejti a program időtartamát,
  és üres névvel nem enged menteni.
- Ugyanez a német felületen is teljesül. Mobilon nincs vízszintes kilógás.

A böngészős tesztek minden API-kérést elfognak, éles fiókot vagy adatbázist nem használnak.
A backend tényleges tranzakciós és migrációs ellenőrzései a backend repóban futnak.

## Futtatás

```bash
./node_modules/.bin/ng test --watch=false --browsers=FirefoxHeadless
```

Az `e2e` könyvtárból:

```bash
npm run test:personal-programs
```

Eredmény: a teljes frontend unit készlet 325 tesztje, illetve a saját programok és
önálló edzések 26 desktop/mobil böngészős tesztje sikeres.
