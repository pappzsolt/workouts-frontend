# P2 MODEL AUDIT / CLEANUP

Forrás: `src(20260926-202617).zip`

## P2 elvégzett változtatások

### 1. Biztosan használaton kívüli modellek törölve

A teljes `src/app` statikus használati keresése alapján ezeknek nem volt használatuk a saját deklarációjukon kívül:

- `models/backend-dto/user/program/program-workout-response.ts`
- `models/backend-dto/userprogramstatistics/weekly-workout-volume-dto.ts`
- `models/backend-dto/userprogramstatistics/workout-activity-dto.ts`
- `models/backend-dto/userworkoutexerciseset/create-exercise-set-request.ts`

A `ProgramWorkoutResponse` törlése után a csak általa használt
`models/backend-dto/user/program/workout-exercise-response.ts` is használaton kívülivé vált, ezért ezt is töröltem.

### 2. Program modellek tisztítása

A `Program` frontend modellből eltávolítva a korábbi, nem használt/duplikált mezők:

- `name`
- `description`
- `coachId`

A `/coach/search` response nem tartalmaz `workouts` tömböt, csak `workoutCount`, ezért a frontend `Program` és `CoachProgram` modellekből a `workouts` mező is kikerült.

Ezzel együtt a kizárólag ehhez tartozó, használaton kívüli modellek is törölve:

- `ProgramWorkoutSummary`
- `ProgramExercise`

A `coach-program.component.ts` mappingből is kikerült a `workouts` hozzárendelés.

### 3. P2 response aliasok

A következő korábbi duplikált response típusok már nem voltak jelen a bemeneti ZIP-ben, ezért újra nem hoztam létre őket:

- `CreateCoachResponse`
- `CreateUserResponse`
- `CoachProgramSearchItem`
- `CoachProgramSearchResponse`
- `UserProgramApiItem`
- `WorkoutListResponse`
- `PagedWorkoutResponse`
- `MembersResponse`

## Ellenőrzés

- Használaton kívüli exportált model deklaráció: **0**
- Pontosan azonos interface struktúra: **0**
- Törölt P2 modellekre maradt referencia: **0**
- `ProgramWorkoutSummary` referencia: **0**
- `ProgramExercise` referencia: **0**
- `program.workouts` referencia: **0**

## Amit szándékosan NEM vontam össze

A következő DTO/domain párok hasonlóság ellenére külön maradtak, mert más réteget/szerződést jelentenek:

- `ProgramDto` ↔ `Program`
- `GetProgramsForLoggedInCoachDto` ↔ `CoachProgram`
- `ProgramStatisticsDto` ↔ `ProgramStatisticsProgram`
- `ProgramWorkoutAssignmentDto` ↔ `ProgramWorkoutAssignment`
- `ProgramProgressDto` ↔ `ProgramProgress`

Ezeknél a DTO nullability és a frontend normalizált modell külön szerepet tölt be.

## Külön észrevétel

A forrásban a coach/user/admin layoutok még a már nem létező
`CoachMenuComponent`, `UserMenuComponent`, `AdminMenuComponent` fájlokra hivatkoznak,
miközben a projektben jelenleg a közös `DynamicMenuComponent` található.

Ez **nem P2 model-tisztítás**, hanem külön compile/runtime javítási feladat, ezért ebben a P2 csomagban szándékosan nem módosítottam a menürendszert.
