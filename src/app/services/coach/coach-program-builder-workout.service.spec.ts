import { of } from 'rxjs';
import { CoachProgramBuilderWorkoutService } from './coach-program-builder-workout.service';

describe('Builder exercise relationship persistence', () => {
  it('sends the desired membership in one atomic request and reloads on success', () => {
    const exerciseApi = jasmine.createSpyObj('ExerciseService', ['getWorkoutExercises']);
    const relationships = jasmine.createSpyObj('WorkoutExerciseService', ['replaceWorkoutExercises']);
    const service = new CoachProgramBuilderWorkoutService(exerciseApi, {} as any, {} as any, relationships, {} as any);
    exerciseApi.getWorkoutExercises.and.returnValue(of({ id: 5, exercises: [] }));
    relationships.replaceWorkoutExercises.and.returnValue(of({ success: true, data: null, message: 'saved' }));
    service.saveExercises(5, [{ id: 2 }, { id: 3 }] as any).subscribe(result => {
      expect(result.results.every(row => row.success)).toBeTrue();
      expect(result.workout.id).toBe(5);
    });
    expect(relationships.replaceWorkoutExercises).toHaveBeenCalledOnceWith(5, [2, 3]);
  });
});
