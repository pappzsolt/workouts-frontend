import { dbOne } from './e2e-next-3-helpers';

export async function getWorkoutExerciseInDatabase(workoutId:number, exerciseId:number): Promise<any|null> {
  return dbOne(`SELECT * FROM public.workout_exercises WHERE workout_id=$1 AND exercise_id=$2 LIMIT 1`,[workoutId,exerciseId]);
}
export async function assertWorkoutExerciseInDatabase(workoutId:number, exerciseId:number): Promise<void> {
  if (!(await getWorkoutExerciseInDatabase(workoutId,exerciseId))) throw new Error(`Workout exercise relation ${workoutId}/${exerciseId} not found`);
}
export async function assertWorkoutExerciseDeleted(workoutId:number, exerciseId:number): Promise<void> {
  if (await getWorkoutExerciseInDatabase(workoutId,exerciseId)) throw new Error(`Workout exercise relation ${workoutId}/${exerciseId} still exists`);
}
export async function assertWorkoutInDatabase(id:number, expected?:any): Promise<void> {
  const row=await dbOne(`SELECT id FROM public.workouts WHERE id=$1`,[id]);
  if (!row) throw new Error(`Workout ${id} not found`);
}
export async function assertWorkoutDeleted(id:number): Promise<void> {
  const row=await dbOne(`SELECT id FROM public.workouts WHERE id=$1`,[id]); if(row) throw new Error(`Workout ${id} still exists`);
}
export async function closeWorkoutDatabase(): Promise<void> {}
