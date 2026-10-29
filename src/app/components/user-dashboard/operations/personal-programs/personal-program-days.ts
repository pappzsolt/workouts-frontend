import type { PersonalProgramDay } from '../../../../models/personal-program.model';
import type { CoachExerciseSearchItem } from '../../../../models/coach-workspace.model';
import type { PersonalProgramState } from './personal-program-state';

/** Day and exercise mutations, picker selection and translated exercise names. */
export class PersonalProgramDays {
  constructor(private readonly state: PersonalProgramState) {}

  pickerDay: PersonalProgramDay | null = null;

  names: Record<number, string> = {};

  catalogueFailed = false;

  get chosenIds(): number[] {
    return this.pickerDay?.exercises.map((e) => e.exerciseId) ?? [];
  }

  addDay(): void {
    if (this.state.standaloneMode || this.state.locked || this.state.model.workouts.length >= 366) return;
    const used = new Set(this.state.model.workouts.map((day) => day.dayIndex));
    let index = 1;
    while (used.has(index) && index <= this.state.model.durationDays) index++;
    if (index > this.state.model.durationDays) {
      this.state.message = 'personalPrograms.noFreeDay';
      this.state.messageType = 'info';
      return;
    }
    this.state.model.workouts.push({ dayIndex: index, name: '', description: null, exercises: [] });
    this.state.changed();
  }

  removeDay(day: PersonalProgramDay): void {
    if (this.state.standaloneMode || this.state.locked) return;
    this.state.model.workouts = this.state.model.workouts.filter((item) => item !== day);
    if (this.pickerDay === day) this.pickerDay = null;
    this.state.changed();
  }

  addExercise(exercise: CoachExerciseSearchItem): void {
    if (
      !this.pickerDay ||
      this.state.locked ||
      this.chosenIds.includes(exercise.id) ||
      this.pickerDay.exercises.length >= 100
    )
      return;
    this.names[exercise.id] = exercise.name;
    this.pickerDay.exercises.push({
      exerciseId: exercise.id,
      sets: 3,
      repetitions: 10,
      restSeconds: 60,
      notes: null,
    });
    this.state.changed();
  }

  removeExercise(day: PersonalProgramDay, index: number): void {
    if (this.state.locked) return;
    day.exercises.splice(index, 1);
    this.state.changed();
  }

  moveExercise(day: PersonalProgramDay, index: number, direction: number): void {
    const target = index + direction;
    if (this.state.locked || target < 0 || target >= day.exercises.length) return;
    [day.exercises[index], day.exercises[target]] = [day.exercises[target], day.exercises[index]];
    this.state.changed();
  }
}
