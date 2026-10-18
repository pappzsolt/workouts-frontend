import { UserExercisesComponent } from './user-exercises.component';
import type { UserWorkoutExerciseDetailDto } from '../../../../models/user-workout-exercise-detail.dto';

describe('UserExercisesComponent - actual user workout sets', () => {
  const component = Object.create(UserExercisesComponent.prototype) as UserExercisesComponent;
  const exerciseWithTargets = (targets: Array<number | null>) => ({
    sets: 3,
    repetitions: 10,
    userWorkoutExerciseSets: targets.map(targetRepetitions => ({ targetRepetitions })),
  }) as UserWorkoutExerciseDetailDto;

  it('shows the actual 2 sets instead of the 3 sets from the template', () => {
    const exercise = exerciseWithTargets([10, 10]);
    expect(component.getSetCount(exercise)).toBe(2);
    expect(component.getTargetRepetitions(exercise)).toBe('10');
  });

  it('lists differing prescribed repetitions', () => {
    expect(component.getTargetRepetitions(exerciseWithTargets([10, 8, 6]))).toBe('10 / 8 / 6');
  });

  it('does not fall back to stale template values for empty sets', () => {
    const exercise = exerciseWithTargets([]);
    expect(component.getSetCount(exercise)).toBe(0);
    expect(component.getTargetRepetitions(exercise)).toBe('-');
  });
});
