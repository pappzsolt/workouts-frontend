import { dbOne } from './e2e-next-3-helpers';

export async function getWorkoutExerciseInDatabase(workoutId:number, exerciseId:number): Promise<any|null> {
  return dbOne(`SELECT * FROM public.workout_exercises WHERE workout_id=$1 AND exercise_id=$2 LIMIT 1`,[workoutId,exerciseId]);
}
export async function assertWorkoutExerciseInDatabase(workoutId:number, exerciseId:number): Promise<any> {
  const row = await getWorkoutExerciseInDatabase(workoutId, exerciseId);
  if (!row) throw new Error(`Workout exercise relation ${workoutId}/${exerciseId} not found`);
  return row;
}
export async function assertWorkoutExerciseDeleted(workoutId:number, exerciseId:number): Promise<void> {
  if (await getWorkoutExerciseInDatabase(workoutId,exerciseId)) throw new Error(`Workout exercise relation ${workoutId}/${exerciseId} still exists`);
}
export async function assertWorkoutInDatabase(id:number, expected?:any): Promise<any> {
  const language = expected?.language ?? 'hu';
  const row = await dbOne(`SELECT
      w.id,
      COALESCE(wt.name, '') AS name,
      COALESCE(wt.description, '') AS description,
      w.workout_date::text AS workout_date,
      w.duration_minutes,
      w.intensity_level
    FROM public.workouts w
    LEFT JOIN LATERAL (
      SELECT wt.name, wt.description
      FROM public.workout_translations wt
      JOIN public.languages l ON l.id = wt.language_id
      WHERE wt.workout_id = w.id
      ORDER BY CASE WHEN l.code = $2 THEN 0 WHEN l.code = 'hu' THEN 1 ELSE 2 END, l.id
      LIMIT 1
    ) wt ON TRUE
    WHERE w.id = $1`, [id, language]);
  if (!row) throw new Error(`Workout ${id} not found`);
  return row;
}
export async function assertWorkoutDeleted(id:number): Promise<void> {
  const row=await dbOne(`SELECT id FROM public.workouts WHERE id=$1`,[id]); if(row) throw new Error(`Workout ${id} still exists`);
}
export async function closeWorkoutDatabase(): Promise<void> {}
