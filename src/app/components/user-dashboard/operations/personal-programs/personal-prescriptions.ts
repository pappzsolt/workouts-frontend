import type {
  PersonalProgramExercise,
  PersonalProgramRequest,
  PersonalSetTarget,
} from '../../../../models/personal-program.model';
import { WORKOUT_PRESCRIPTION_LIMITS as limits } from '../../../../models/workout-prescription-limits';

export function initialSetTargets(exercise: PersonalProgramExercise): PersonalSetTarget[] {
  return Array.from({ length: exercise.sets }, () => ({
    targetRepetitions: exercise.repetitions,
    targetWeightKg: null,
    restSeconds: exercise.restSeconds,
    targetRpe: null,
    notes: exercise.notes,
  }));
}

export function preparePersonalPrescriptions(program: PersonalProgramRequest): void {
  for (const day of program.workouts) {
    for (const exercise of day.exercises) {
      exercise.setTargets ??= initialSetTargets(exercise);
    }
  }
}

export function syncExercisePrescription(exercise: PersonalProgramExercise): void {
  const first = exercise.setTargets?.[0];
  if (!first) return;
  exercise.sets = exercise.setTargets!.length;
  exercise.repetitions = first.targetRepetitions;
  exercise.restSeconds = first.restSeconds;
  exercise.notes = first.notes;
}

const integer = (value: number, min: number, max: number) =>
  Number.isInteger(value) && value >= min && value <= max;
export function validPersonalPrescriptions(program: PersonalProgramRequest): boolean {
  return program.workouts.every(
    (day) =>
      day.name.trim().length > 0 &&
      day.name.length <= 255 &&
      day.exercises.every((exercise) => {
        const targets = exercise.setTargets;
        return (
          integer(exercise.sets, 1, limits.maxSets) &&
          integer(exercise.repetitions, 1, limits.maxRepetitions) &&
          integer(exercise.restSeconds, 0, limits.maxRestSeconds) &&
          (!targets ||
            (targets.length === exercise.sets &&
              targets.every(
                (target) =>
                  integer(target.targetRepetitions, 1, limits.maxRepetitions) &&
                  integer(target.restSeconds, 0, limits.maxRestSeconds) &&
                  (target.targetWeightKg == null ||
                    (Number.isFinite(target.targetWeightKg) &&
                      target.targetWeightKg >= 0 &&
                      target.targetWeightKg <= 9999.99 &&
                      Math.abs(
                        target.targetWeightKg * 100 - Math.round(target.targetWeightKg * 100),
                      ) < 1e-7)) &&
                  (target.targetRpe == null ||
                    (Number.isFinite(target.targetRpe) &&
                      target.targetRpe >= 0 &&
                      target.targetRpe <= 10 &&
                      Number.isInteger(target.targetRpe * 2))) &&
                  (target.notes?.length ?? 0) <= 255,
              )))
        );
      }),
  );
}
