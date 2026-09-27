# Model audit – P3 continuation

## Completed
- Removed unused legacy AdminLayoutComponent, CoachLayoutComponent and UserLayoutComponent. The active routes use LayoutComponent directly.
- Removed RawScheduledWorkout.
- ScheduledWorkoutRecord is now the single raw scheduled-workout response shape used by both user and coach services.

## Kept intentionally
- ScheduledWorkout remains the normalized UI model.
- RawWorkoutRecord remains separate because workouts-by-program uses a different response shape and is mapped to UserWorkoutOccurrence.
- ProgramStatistics / ProgramStatisticsDto remain separate because one is a normalized frontend model and the other is the backend nullable DTO.
- ProgramProgress / ProgramProgressDto remain separate for the same reason.

## Next
- Split app-types.model.ts by domain if desired; this is structural cleanup, not a functional fix.
- Run the full Angular build with the complete project (package.json/angular.json/tsconfig) and fix any remaining compiler/template issues.
