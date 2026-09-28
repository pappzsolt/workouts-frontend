Exercise UPDATE E2E javítás

A javítás két problémát kezel:

1. Backend:
   PUT /api/exercises/update?language=hu korábban az EXERCISES táblából
   adott vissza ExerciseDto-t, ezért a fordított mezők (name, description,
   bodyPart, stb.) null-ok lehettek a response.data-ban.
   A javított service UPDATE után a kiválasztott nyelv fordításával együtt
   tölti vissza az exercise-t.

2. E2E:
   A korábbi navigateSpa() nem valódi browser reload volt. Ugyanazon az
   Angular route-on a komponens/state újrahasználható maradt.
   A teszt most page.reload()-ot használ, így a description ténylegesen
   az API-ból töltődik vissza.

Plusz:
- Az E2E ellenőrzi, hogy az UPDATE response.data.description tényleg az
  új description.
- A request contract továbbra is ellenőrzi, hogy csak a description változik.
- PostgreSQL ellenőrzés és restore megmarad.

Fájlok:
backend/.../ExerciseRepository.java
backend/.../ExerciseService.java
e2e/tests/coach-exercise-write.spec.ts

Beillesztés:
- A backend két Java fájlját cseréld a projekt megfelelő helyén.
- Az E2E spec fájlt cseréld.
- Backend újraindítás után futtasd:

npx playwright test tests/coach-exercise-write.spec.ts -g "UPDATE:" --headed

Majd:

npx playwright test tests/coach-exercise-write.spec.ts --headed
