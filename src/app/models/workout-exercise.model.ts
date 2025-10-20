// WorkoutExercise model
export interface WorkoutExerciseModel {
  // 🔹 Felvitelhez
  workoutId?: number;    // kötelező felvitelhez, simple felvitelhez
  exerciseId?: number;   // kötelező felvitelhez, simple felvitelhez
  sets?: number;
  repetitions?: number;
  orderIndex?: number;
  restSeconds?: number;
  notes?: string;
  userId?: number;       // opcionális: user-specifikus felvitelhez
  done?: boolean;
  workoutDate?: string;
  weightUsed?: number;

  // 🔹 Törléshez
  id?: number;           // ID-alapú törléshez
}
// models/saved-workout-exercise.model.ts
export interface SavedWorkoutExercise {
  id: number | null;
  workoutId: number;
  exerciseId: number;
  workoutName: string;
  exerciseName: string;
  status: string; // "success" vagy "exists"
  message?: string; // opcionális
}
