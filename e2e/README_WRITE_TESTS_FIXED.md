# Workouts E2E write tests – fixed

A csomag a meglévő Coach Exercise / Workout write teszteket tartalmazza, plusz:
- Workout DELETE teszt szerkezetileg javítva (a korábbi UPDATE testbe ágyazott test() hiba megszűnt).
- Workout → Exercise UI hozzárendelés + API response + PostgreSQL `workout_exercises` ellenőrzés.
- Hozzárendelés cleanup és DB ellenőrzés.
- Nem létező workout ASSIGN negatív teszt.
- Dupla ASSIGN negatív teszt.
- A meglévő Exercise CREATE/UPDATE/DELETE/negative tesztet nem cseréli le új logikára.

## Futtatás

```bash
npx playwright test tests/coach-workout-write.spec.ts --headed
npx playwright test tests/coach-workout-write.spec.ts -g "ASSIGN:" --headed
npx playwright test tests/coach-exercise-write.spec.ts --headed
```

Az ASSIGN teszt az `E2E_EXERCISE_ID` változót használja, alapértelmezésben `1046`.
A teszt az adott nyelvű exercise translation nevét DB-ből olvassa ki, ezért nem hard-code-olja a nevet.
