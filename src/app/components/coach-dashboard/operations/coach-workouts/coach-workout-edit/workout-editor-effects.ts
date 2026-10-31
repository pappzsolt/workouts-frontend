export interface WorkoutEditorEffects {
  setMessage(message: string, type: 'success' | 'error'): void;
  loadWorkoutExercises(): void;
}
