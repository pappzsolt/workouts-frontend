import type { ProgramWorkoutAssignment } from './program-workout-assignment.model';
import type { WorkoutWithExercises } from './exercise.model';

export interface ProgramWorkoutOccurrence {
  readonly assignment: ProgramWorkoutAssignment;
  readonly workout: WorkoutWithExercises;
}

export class ProgramWorkoutState {
  occurrences: ProgramWorkoutOccurrence[] = [];

  get assignments(): ProgramWorkoutAssignment[] {
    return this.occurrences.map((row) => row.assignment);
  }

  get nextDayIndex(): number {
    return Math.max(0, ...this.assignments.map((row) => row.dayIndex)) + 1;
  }

  load(assignments: ProgramWorkoutAssignment[], workouts: WorkoutWithExercises[]): void {
    const byId = new Map(workouts.map((workout) => [workout.id, workout]));
    const ids = new Set<number>();
    const days = new Set<number>();
    const rows = assignments.map((assignment) => {
      const workout = byId.get(assignment.workoutId);
      if (![assignment.id, assignment.programId, assignment.workoutId, assignment.dayIndex]
          .every((value) => Number.isInteger(value) && value > 0) ||
          !workout || ids.has(assignment.id) || days.has(assignment.dayIndex)) {
        throw new Error('Inconsistent program-workout data received from backend.');
      }
      ids.add(assignment.id);
      days.add(assignment.dayIndex);
      return { assignment: { ...assignment }, workout };
    });
    this.occurrences = rows.sort((a, b) => a.assignment.dayIndex - b.assignment.dayIndex);
  }

  remove(id: number): void {
    this.occurrences = this.occurrences.filter((row) => row.assignment.id !== id);
  }

  update(assignment: ProgramWorkoutAssignment): void {
    const current = this.occurrences.find((row) => row.assignment.id === assignment.id);
    if (!current || current.assignment.workoutId !== assignment.workoutId ||
        current.assignment.programId !== assignment.programId) {
      throw new Error('Unexpected program-workout update received from backend.');
    }
    const assignments = this.assignments.map((row) => row.id === assignment.id ? assignment : row);
    this.load(assignments, this.occurrences.map((row) => row.workout));
  }
}
