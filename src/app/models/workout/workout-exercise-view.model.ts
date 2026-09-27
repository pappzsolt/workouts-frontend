/** WorkoutExerciseView frontend model. */
export interface WorkoutExerciseView {
  id?: number;
  workoutId: number;
  exerciseId?: number;
  exercise?: import('../exercise.model').Exercise;
  sets?: number;
  repetitions?: number;
  orderIndex?: number;
  restSeconds?: number;
  notes?: string;
  done?: boolean;
  name?: string;

}
