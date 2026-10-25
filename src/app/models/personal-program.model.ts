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
  name: string;
  description: string | null;
  durationDays: number;
  startDate: string | null;
  difficultyLevel: string | null;
  languageCode: string | null;
  workouts: PersonalProgramDay[];
}
export interface PersonalProgramSummary {
  id: number;
  name: string;
  startDate: string | null;
  durationDays: number;
  startedAt: string | null;
}
export interface PersonalProgramDetail {
  id: number;
  startedAt: string | null;
  program: PersonalProgramRequest;
}
