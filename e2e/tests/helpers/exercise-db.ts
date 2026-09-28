import { dbOne } from './e2e-next-3-helpers';

export async function getExerciseInDatabase(id:number, language='hu'): Promise<any|null> {
  return dbOne(`SELECT e.id, COALESCE(et.name,'') AS name, COALESCE(et.description,'') AS description
                FROM public.exercises e
                LEFT JOIN public.exercise_translations et ON et.exercise_id=e.id
                  AND et.language_id=(SELECT id FROM public.languages WHERE code=$2 LIMIT 1)
                WHERE e.id=$1`, [id, language]);
}
export async function assertExerciseDeleted(id:number): Promise<void> {
  const row=await getExerciseInDatabase(id); if(row) throw new Error(`Exercise ${id} still exists`);
}
export async function assertExerciseDescriptionInDatabase(id:number, description:string, language='hu'): Promise<void> {
  const row=await getExerciseInDatabase(id,language);
  if (!row || String(row.description ?? '') !== String(description)) throw new Error(`Exercise ${id} description mismatch`);
}
export async function assertExerciseUnchangedExceptDescription(id:number, before:any, language='hu'): Promise<void> {
  const after=await getExerciseInDatabase(id,language);
  if (!after) throw new Error(`Exercise ${id} not found`);
  for (const k of Object.keys(before ?? {})) if (k !== 'description' && String(after[k] ?? '') !== String(before[k] ?? '')) throw new Error(`Exercise ${id}: ${k} changed unexpectedly`);
}
export async function closeExerciseDatabase(): Promise<void> {}
