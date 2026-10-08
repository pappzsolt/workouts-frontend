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
