import type { UserWorkoutDto } from '../../models/backend-dto/workout/user-workout-dto';
import type { WorkoutDto } from '../../models/backend-dto/exercise/workout-dto';
import { emptyWorkoutForm, toWorkoutCatalogItem, toWorkoutForm, toWorkoutRequest } from './workout-mapping';

describe('Workout template model boundaries', () => {
  const detail: UserWorkoutDto = {
    workoutId: 7, workoutName: 'Template', workoutDescription: 'Description',
    workoutDate: '2026-10-29T12:30:00', durationMinutes: 45, intensityLevel: 'moderate',
    dayIndex: 3, done: false, userWorkoutId: 50, programWorkoutId: 60, programId: 70,
    completed: true, performedAt: '2026-10-29T12:30:00', actualSets: 12,
    actualRepetitions: 100, weightUsed: 20, durationSeconds: 2700,
    feedback: 'Feedback', notes: 'Notes',
  };

  it('keeps user occurrence progress and duplicate text fields out of the template form', () => {
    const form = toWorkoutForm(emptyWorkoutForm(), detail);
    expect(form).toEqual({
      id: 7, name: 'Template', description: 'Description', workoutDate: '2026-10-29',
      durationMinutes: 45, intensityLevel: 'MEDIUM', dayIndex: 3, done: false,
    });
    expect(toWorkoutRequest(form)).toEqual({
      id: 7, name: 'Template', description: 'Description', workoutDate: '2026-10-29',
      durationMinutes: 45, intensityLevel: 'MEDIUM', dayIndex: 3, done: false,
    });
    expect(detail.completed).toBeTrue();
    expect(detail.workoutName).toBe('Template');
  });

  it('retains the current template ID and clears missing optional values on reload', () => {
    const current = { ...emptyWorkoutForm(), id: 7, name: 'Draft', durationMinutes: 30, done: true };
    const form = toWorkoutForm(current, {
      ...detail, workoutId: null, workoutName: null, workoutDescription: null, workoutDate: null,
      durationMinutes: null, intensityLevel: null, dayIndex: null, done: null,
    });
    expect(form).toEqual({
      id: 7, name: '', description: '', workoutDate: undefined,
      durationMinutes: undefined, intensityLevel: undefined, dayIndex: undefined, done: undefined,
    });
    expect(current.name).toBe('Draft');
  });

  for (const [input, expected] of [
    ['low', 'LOW'], ['INTERMEDIATE', 'MEDIUM'], ['HIGH', 'HIGH'], ['unknown', undefined],
  ] as const) {
    it(`preserves intensity normalization for ${input}`, () => {
      expect(toWorkoutForm(emptyWorkoutForm(), { ...detail, intensityLevel: input }).intensityLevel).toBe(expected);
    });
  }

  it('keeps a cleared numeric form control as null in the request', () => {
    expect(toWorkoutRequest({ ...emptyWorkoutForm(), durationMinutes: null }).durationMinutes).toBeNull();
  });

  it('uses one name and description in catalogue data without attaching occurrence state', () => {
    const source: WorkoutDto = {
      id: 7, name: 'Template', description: 'Description', workoutDate: null,
      durationMinutes: null, intensityLevel: null, done: false, programNames: null, exercises: null,
    };
    expect(toWorkoutCatalogItem(source)).toEqual({
      id: 7, name: 'Template', description: 'Description', workoutDate: undefined,
      durationMinutes: undefined, intensityLevel: undefined, done: false, exercises: [],
    });
  });
});
