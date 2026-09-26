/** GENERATED FROM BACKEND JAVA DTO. Do not add UI-only fields here. */
export interface ExerciseDto {
  id: number | null;
  name: string | null;
  description: string | null;
  bodyPart: string | null;
  synonyms: string | null;
  instructions: string | null;
  tips: string | null;
  primaryMuscles: string | null;
  secondaryMuscles: string | null;
  imageUrl: string | null;
  videoUrl: string | null;
  muscleGroup: string | null;
  equipment: string | null;
  difficultyLevel: string | null;
  category: string | null;
  caloriesBurnedPerMinute: number | null;
  durationSeconds: number | null;
  done: boolean | null;
  forceType: string | null;
  mechanic: string | null;
  isUnilateral: boolean | null;
  isBodyweight: boolean | null;
  variationGroup: string | null;
}
