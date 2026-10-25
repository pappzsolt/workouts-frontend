export interface PersonalProgramExercise {
  exerciseId: number;
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
export interface PersonalProgramDetail {
  standalone?: boolean;
  id: number;
  startedAt: string | null;
  program: PersonalProgramRequest;
}
