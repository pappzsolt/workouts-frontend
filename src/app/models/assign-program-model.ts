export interface ExerciseDto {
  exerciseId: number;
  exerciseName: string;
  exerciseDescription: string;
  sets: number;
  repetitions: number;
  restSeconds: number;
  notes: string;
}

export interface WorkoutDto {
  workoutId: number;
  workoutName: string;
  workoutDescription: string;
  exercises: ExerciseDto[];
}

export interface ProgramDto {
  programId: number;
  programName: string;
  programDescription: string;
  startDate?: string | null;
  endDate?: string | null;
  durationDays: number;
  difficultyLevel: string;
  workouts: WorkoutDto[];
}

export interface UserProgramDto {
  programId: number;
  programName: string;
  programDescription: string;
  startDate?: string | null;
  endDate?: string | null;
  durationDays: number;
  difficultyLevel: string;
  status: string;
  assignedAt: string;
}

