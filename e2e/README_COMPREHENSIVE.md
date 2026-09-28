# Comprehensive Workout / Exercise E2E

Ez a suite a backend/frontend/DB audit alapján a coach számára releváns három erőforrás teljes endpoint-mátrixát ellenőrzi:

- `/api/workouts`
- `/api/exercises`
- `/api/workout-exercises`

Lefedés:
- Workout CRUD
- Workout GET/list/search/program GET
- Exercise CRUD
- Exercise list/search
- Exercise search pagination validation
- Workout ↔ Exercise assign
- assignment default értékek
- assignment GET
- order-index update + negatív érték
- relation delete + második delete
- invalid ID negatív tesztek
- üres exercise név
- PostgreSQL állapot ellenőrzés és cleanup

A meglévő UI tesztek továbbra is szükségesek: ez a suite az endpoint-mátrixot és a DB invariánsokat egészíti ki.
