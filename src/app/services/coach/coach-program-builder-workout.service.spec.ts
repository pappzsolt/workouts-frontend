import { of } from 'rxjs';
import { CoachProgramBuilderWorkoutService } from './coach-program-builder-workout.service';

describe('Builder exercise relationship persistence', () => {
  it('deletes deselected exercises and retries only failed additions', () => {
    const exerciseApi = jasmine.createSpyObj('ExerciseService', ['getWorkoutExercises']);
    const relationships = jasmine.createSpyObj('WorkoutExerciseService', ['assignExerciseToWorkout', 'deleteExerciseFromWorkout']);
    const service = new CoachProgramBuilderWorkoutService(exerciseApi, {} as any, {} as any, relationships, {} as any);
    const exercise = (id: number) => ({ id, name: String(id) });
    const workout = (ids: number[]) => ({ id: 5, exercises: ids.map(id => ({ exercise: exercise(id) })) });
    exerciseApi.getWorkoutExercises.and.returnValues(
      of(workout([1])), of(workout([2])), of(workout([2])), of(workout([2, 3])),
    );
    relationships.deleteExerciseFromWorkout.and.returnValue(of({ success: true, data: null, message: null }));
    relationships.assignExerciseToWorkout.and.returnValues(
      of({ success: true, data: null, message: null }),
      of({ success: false, data: null, message: 'failed' }),
      of({ success: true, data: null, message: null }),
    );
    const selected = [exercise(2), exercise(3)] as any;
    service.saveExercises(5, selected).subscribe(result => expect(result.results.some(row => !row.success)).toBeTrue());
    expect(relationships.deleteExerciseFromWorkout.calls.allArgs()).toEqual([[5, 1]]);
    relationships.assignExerciseToWorkout.calls.reset();
    service.saveExercises(5, selected).subscribe(result => expect(result.results.every(row => row.success)).toBeTrue());
    expect(relationships.assignExerciseToWorkout.calls.allArgs()).toEqual([[5, 3]]);
  });
});
