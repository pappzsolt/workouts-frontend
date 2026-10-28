import { toExercise, toWorkoutExercise } from './exercise-mapping';
import type { ExerciseDto } from '../../models/backend-dto/exercise/exercise-dto';

const dto = (patch: Partial<ExerciseDto> = {}): ExerciseDto => ({
  id: 4, name: null, description: null, bodyPart: 'Láb', synonyms: null, instructions: null, tips: null,
  primaryMuscles: null, secondaryMuscles: null, imageUrl: null, videoUrl: null, muscleGroup: null, equipment: null,
  difficultyLevel: null, category: null, caloriesBurnedPerMinute: null, durationSeconds: null, done: null,
  forceType: null, mechanic: null, isUnilateral: false, isBodyweight: null, variationGroup: null, ...patch,
});

describe('exercise mapping', () => {
  it('turns missing values into undefined and a missing name into an empty string', () => {
    const exercise = toExercise(dto());
    expect(exercise.id).toBe(4);
    expect(exercise.name).toBe('');
    expect(exercise.bodyPart).toBe('Láb');
    expect(exercise.description).toBeUndefined();
    expect(exercise.isUnilateral).toBeFalse();
  });

  it('defaults the numbers of a workout exercise to 0 and done to false', () => {
    const item = toWorkoutExercise({
      id: 1, workoutId: 2, exercise: dto({ name: 'Guggolás' }), sets: null, repetitions: 5, orderIndex: null,
      restSeconds: null, notes: null, done: null, userWorkoutExerciseId: null,
    });
    expect(item).toEqual(jasmine.objectContaining({ id: 1, workoutId: 2, sets: 0, repetitions: 5, orderIndex: 0, restSeconds: 0, done: false }));
    expect(item.notes).toBeUndefined();
    expect(item.exercise.name).toBe('Guggolás');
  });
});
