export interface Workout {
  id?: number;
  workoutName?: string;
  name?: string;          // backend name mező, más helyeken használva
  description?: string;
  durationMinutes?: number;
  difficultyLevel?: string;
  programId?: number;

  // Új mezők a WorkoutDto alapján, opcionálisan
  workoutDescription?: string;
  workoutDate?: string;       // ISO string
  intensityLevel?: string;
  dayIndex?: number;
  completed?: boolean;
  performedAt?: string;       // ISO string
  actualSets?: number;
  actualRepetitions?: number;
  weightUsed?: number;
  durationSeconds?: number;
  feedback?: string;
  notes?: string;
  done?: boolean;
}

export interface WorkoutResponse {
  status: string;
  message: string;
  data?: Workout; // 🔹 hozzáadva a backend "data" mezőhöz, kompatibilis a régi kóddal
}

export interface WorkoutListResponse {
  status: string;
  workouts: Workout[];
  message?: string;
}
