export interface PersonalSetTarget {
  userWorkoutSetId?: number;
  targetRepetitions: number;
  targetWeightKg: number | null;
  restSeconds: number;
  targetRpe: number | null;
  notes: string | null;
}
export interface PersonalProgramExercise {
  exerciseId: number;
  /** Execution-only identity; never part of the shared template request. */
  userExerciseId?: number | null;
  executionEditable?: boolean;
  setTargets?: PersonalSetTarget[] | null;
  sets: number;
  repetitions: number;
  restSeconds: number;
  notes: string | null;
}
export interface PersonalProgramDay {
  dayIndex: number;
  name: string;
  description: string | null;
  exercises: PersonalProgramExercise[];
}
export interface PersonalProgramRequest {
  expectedVersion?: number | null;
  name: string;
  description: string | null;
  durationDays: number;
  startDate: string | null;
  difficultyLevel: string | null;
  languageCode: string | null;
  workouts: PersonalProgramDay[];
}
export interface PersonalProgramSummary {
  standalone?: boolean;
  id: number;
  name: string;
  startDate: string | null;
  durationDays: number;
  startedAt: string | null;
}
export type StandaloneWorkoutStatus = 'draft' | 'planned' | 'inProgress' | 'done';
export interface StandaloneWorkoutOccasion extends PersonalProgramSummary {
  description: string | null;
  status: StandaloneWorkoutStatus;
  completedDate: string | null;
}
export interface StandaloneWorkoutGroup {
  groupId: number;
  name: string;
  description: string | null;
  occasions: StandaloneWorkoutOccasion[];
}
export interface PersonalProgramDetail {
  standalone?: boolean;
  id: number;
  startedAt: string | null;
  program: PersonalProgramRequest;
}

/** Live targets on a started personal program day (never the frozen template). */
export interface PersonalDayTargets {
  dayIndex: number;
  version: number;
  editable: boolean;
  exercises: { exerciseIndex: number; userExerciseId: number; exerciseId: number; editable: boolean;
    sets: Pick<PersonalSetTarget,
    'targetRepetitions' | 'targetWeightKg' | 'restSeconds' | 'targetRpe' | 'userWorkoutSetId'>[] }[];
}
export interface PersonalDayTargetsUpdate {
  expectedVersion: number;
  useSetIds?: boolean;
  exercises: { exerciseIndex: number; userExerciseId: number | null; exerciseId: number; sets: PersonalDayTargets['exercises'][number]['sets'] }[];
}

/** Current execution dates of a started personal program, independent of the immutable draft day index. */
export interface PersonalWorkoutSchedule {
  dayIndex: number;
  scheduledAt: string | null;
  version: number;
  editable: boolean;
}
