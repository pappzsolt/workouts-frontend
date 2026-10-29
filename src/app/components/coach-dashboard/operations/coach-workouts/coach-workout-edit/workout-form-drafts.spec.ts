import type { WorkoutForm } from '../../../../../models/workout/workout-form.model';
import { emptyWorkoutForm } from '../../../../../services/shared/workout-mapping';
import { WorkoutFormDrafts } from './workout-form-drafts';

describe('Workout form draft preservation', () => {
  let drafts: WorkoutFormDrafts;
  const saved = (name = 'Magyar név', id = 7): WorkoutForm => ({
    id, name, description: 'Leírás', workoutDate: '2026-10-29', durationMinutes: 30,
    intensityLevel: 'LOW', dayIndex: 1, done: true,
  });

  beforeEach(() => drafts = new WorkoutFormDrafts());

  function reload(current: WorkoutForm, loaded: WorkoutForm, language = 'hu', preserve = true): WorkoutForm {
    drafts.beginLoad(current, loaded.id!, language, preserve);
    return drafts.applyLoaded(current, loaded, loaded.id!, language, preserve);
  }

  it('keeps text drafts per language and shares other edits across languages', () => {
    let form = reload(emptyWorkoutForm(), saved(), 'hu', false);
    form.name = 'Magyar piszkozat';
    form.description = 'Magyar módosítás';
    form.durationMinutes = 45;
    form.intensityLevel = 'HIGH';
    form = reload(form, { ...saved('English name'), description: 'English description' }, 'en');
    expect(form.name).toBe('English name');
    expect(form.description).toBe('English description');
    expect(form.durationMinutes).toBe(45);
    expect(form.intensityLevel).toBe('HIGH');
    form.name = 'English draft';
    form = reload(form, saved());
    expect(form.name).toBe('Magyar piszkozat');
    expect(form.description).toBe('Magyar módosítás');
    expect(form.durationMinutes).toBe(45);
    form = reload(form, saved('English name'), 'en');
    expect(form.name).toBe('English draft');
    expect(form.durationMinutes).toBe(45);
  });

  it('captures edits made during a pending language load under the previous language', () => {
    let form = reload(emptyWorkoutForm(), saved(), 'hu', false);
    drafts.beginLoad(form, 7, 'en', true);
    expect(drafts.context).toBe('7:hu');
    form.description = 'Beírás betöltés közben';
    form.durationMinutes = null;
    form = drafts.applyLoaded(form, { ...saved('English'), description: 'English description' }, 7, 'en', true);
    expect(drafts.context).toBe('7:en');
    expect(form.description).toBe('English description');
    expect(form.durationMinutes).toBeNull();
    form = reload(form, saved());
    expect(form.description).toBe('Beírás betöltés közben');
    expect(form.durationMinutes).toBeNull();
  });

  it('captures edits entered before the first response', () => {
    const form = emptyWorkoutForm();
    drafts.beginLoad(form, 7, 'hu', false);
    form.name = 'Early draft';
    drafts.beginLoad(form, 7, 'hu', true);
    form.durationMinutes = 45;
    const restored = drafts.applyLoaded(form, saved(), 7, 'hu', true);
    expect(restored.name).toBe('Early draft');
    expect(restored.durationMinutes).toBe(45);
  });

  it('removes a cached change when the coach reverts to the loaded value', () => {
    let form = reload(emptyWorkoutForm(), saved(), 'hu', false);
    form.name = 'Draft';
    form.durationMinutes = 45;
    form = reload(form, saved());
    form.name = 'Magyar név';
    form.durationMinutes = 30;
    form = reload(form, { ...saved('New server name'), durationMinutes: 35 });
    expect(form.name).toBe('New server name');
    expect(form.durationMinutes).toBe(35);
  });

  it('preserves explicitly cleared text, dates, numeric fields and unchecked values', () => {
    let form = reload(emptyWorkoutForm(), saved(), 'hu', false);
    form.description = '';
    form.workoutDate = '';
    form.durationMinutes = null;
    form.dayIndex = 0;
    form.done = false;
    form = reload(form, saved());
    expect(form.description).toBe('');
    expect(form.workoutDate).toBe('');
    expect(form.durationMinutes).toBeNull();
    expect(form.dayIndex).toBe(0);
    expect(form.done).toBeFalse();
  });

  it("starts from each workout's own server values when changing workout IDs", () => {
    let form = reload(emptyWorkoutForm(), saved(), 'hu', false);
    form.name = 'First workout draft';
    form.durationMinutes = 45;
    form = reload(form, saved('Second workout', 8));
    expect(form.name).toBe('Second workout');
    expect(form.durationMinutes).toBe(30);
    form.name = 'Second workout draft';
    form = reload(form, saved());
    expect(form.name).toBe('Magyar név');
    expect(form.durationMinutes).toBe(30);
    form = reload(form, saved('Second workout', 8));
    expect(form.name).toBe('Second workout');
  });

  it('uses server data when draft preservation is disabled', () => {
    let form = reload(emptyWorkoutForm(), saved(), 'hu', false);
    form.name = 'Draft';
    form = reload(form, saved());
    form = reload(form, saved('Fresh server name'), 'hu', false);
    expect(form.name).toBe('Fresh server name');
  });

  it('does not mutate the server model or share drafts between editor instances', () => {
    const loaded = saved();
    let form = reload(emptyWorkoutForm(), loaded, 'hu', false);
    form.name = 'Draft';
    expect(loaded.name).toBe('Magyar név');
    form = reload(form, saved());
    expect(form.name).toBe('Draft');
    const other = new WorkoutFormDrafts();
    const empty = emptyWorkoutForm();
    other.beginLoad(empty, 7, 'hu', true);
    expect(other.applyLoaded(empty, loaded, 7, 'hu', true).name).toBe('Magyar név');
  });
});
