/**
 * Backward-compatible barrel for shared frontend models.
 * New code should import models from their domain-specific files.
 */

export type { SelectOption } from './common/select-option.model';
export type { MenuItem } from './common/menu-item.model';
export type { CalendarDay } from './common/calendar-day.model';
export type { NavigationHistoryEntry } from './common/navigation-history-entry.model';
export type { UserNameId } from './common/user-name-id.model';
export type { CoachNameId } from './common/coach-name-id.model';
export type { WorkoutExerciseView } from './workout/workout-exercise-view.model';
export type { UserProgramExerciseRow } from './user-program/user-program-exercise-row.model';
export type { UserProgramExercise } from './user-program/user-program-exercise.model';
export type { UserProgramWorkout } from './user-program/user-program-workout.model';
export type { UserProgramDay } from './user-program/user-program-day.model';
export type { ScheduledWorkout } from './scheduled-workout/scheduled-workout.model';
export type { RawWorkoutRecord } from './scheduled-workout/raw-workout-record.model';
export type { ScheduledWorkoutRecord } from './scheduled-workout/scheduled-workout-record.model';
