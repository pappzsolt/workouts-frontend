// src/app/models/workout-exercise.dto.ts

export interface UserWorkoutExerciseDto {
  id: number;
  userWorkoutId: number;
  workoutExerciseId: number;
  completed: boolean;
  setsDone: number;
  feedback?: string | null;
  notes?: string | null;
  performedAt?: Date | null; // backend java.util.Date -> JS Date

  // 🔹 Új mezők a user_workout létrehozáshoz
  userId?: number;
  workoutId?: number;
  scheduledAt?: string | null; // ISO string formátumban
}

