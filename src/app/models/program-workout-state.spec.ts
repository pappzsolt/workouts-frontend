import { ProgramWorkoutState } from './program-workout-state';
import type { WorkoutWithExercises } from './exercise.model';

describe('ProgramWorkoutState', () => {
  const workout: WorkoutWithExercises = { id: 7, name: 'Workout', description: '', exercises: [] };
  const assignments = [
    { id: 10, programId: 1, workoutId: 7, dayIndex: 2 },
    { id: 11, programId: 1, workoutId: 7, dayIndex: 5 },
  ];
  it('keeps repeated workouts distinct and removes by occurrence id', () => {
    const state = new ProgramWorkoutState();
    state.load(assignments, [workout]);
    expect(state.nextDayIndex).toBe(6);
    state.remove(10);
    expect(state.assignments.map((row) => row.id)).toEqual([11]);
    expect(state.nextDayIndex).toBe(6);
  });
  it('reorders updates without losing the paired workout', () => {
    const state = new ProgramWorkoutState();
    state.load(assignments, [workout]);
    state.update({ ...assignments[1], dayIndex: 1 });
    expect(state.assignments.map((row) => row.id)).toEqual([11, 10]);
    expect(state.occurrences[0].workout).toBe(workout);
    expect(assignments[1].dayIndex).toBe(5);
  });
  it('rejects missing workout, duplicate occurrence and duplicate day without silently filtering', () => {
    const state = new ProgramWorkoutState();
    expect(() => state.load(assignments, [])).toThrow();
    expect(() => state.load([assignments[0], assignments[0]], [workout])).toThrow();
    expect(() => state.load([assignments[0], { ...assignments[1], dayIndex: 2 }], [workout])).toThrow();
  });
});
