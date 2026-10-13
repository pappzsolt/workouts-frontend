import { UserExerciseDetailComponent } from './user-exercises-detail.component';
import type { UserWorkoutExerciseDetailDto } from '../../../../../models/user-workout-exercise-detail.dto';

describe('UserExerciseDetailComponent prescription summary', () => {
  let component: UserExerciseDetailComponent;

  beforeEach(() => {
    component = Object.create(UserExerciseDetailComponent.prototype);
  });

  function prescribe(repetitions: Array<number | null>): void {
    component.workoutExercise = {
      sets: 3,
      repetitions: 10,
      userWorkoutExerciseSets: repetitions.map(targetRepetitions => ({ targetRepetitions })),
    } as UserWorkoutExerciseDetailDto;
  }

  it('uses the execution sets instead of the generic 3 × 10 prescription', () => {
    prescribe([12, 12, 12, 12]);
    expect(component.prescribedSetCount).toBe(4);
    expect(component.prescribedRepetitions).toBe('12');
  });

  it('preserves each set target and its order when repetitions differ', () => {
    prescribe([12, 10, 8, 10]);
    expect(component.prescribedRepetitions).toBe('12 / 10 / 8 / 10');
  });

  it('does not replace missing targets or zero with generic repetitions', () => {
    prescribe([null, 0, 8]);
    expect(component.prescribedRepetitions).toBe('- / 0 / 8');
  });

  it('shows no prescription when there are no execution sets', () => {
    prescribe([]);
    expect(component.prescribedSetCount).toBe(0);
    expect(component.prescribedRepetitions).toBe('-');
  });
});


describe('UserExerciseDetailComponent rest timer navigation', () => {
  let component: UserExerciseDetailComponent;
  let navigatedTo: number | undefined;

  beforeEach(() => {
    component = Object.create(UserExerciseDetailComponent.prototype);
    component.currentSetIndex = 0;
    component.restTimerSetId = 101;
    component.workoutExercise = {
      userWorkoutExerciseSets: [
        { id: 101, completed: true },
        { id: 102, completed: false },
      ],
    } as UserWorkoutExerciseDetailDto;
    navigatedTo = undefined;
    component.goToSet = (index: number) => { navigatedTo = index; };
  });

  it('moves to the next set after the current set rest expires', () => {
    component.onRestFinished(101);
    expect(navigatedTo).toBe(1);
  });

  it('does not move when the user already selected another set', () => {
    component.currentSetIndex = 1;
    component.onRestFinished(101);
    expect(navigatedTo).toBeUndefined();
  });

  it('ignores obsolete timer events and unfinished sets', () => {
    component.onRestFinished(100);
    expect(navigatedTo).toBeUndefined();
    component.workoutExercise!.userWorkoutExerciseSets[0].completed = false;
    component.onRestFinished(101);
    expect(navigatedTo).toBeUndefined();
  });

  it('stays on the final set when there is no next set', () => {
    component.currentSetIndex = 1;
    component.restTimerSetId = 102;
    component.workoutExercise!.userWorkoutExerciseSets[1].completed = true;
    component.onRestFinished(102);
    expect(navigatedTo).toBeUndefined();
  });
});
