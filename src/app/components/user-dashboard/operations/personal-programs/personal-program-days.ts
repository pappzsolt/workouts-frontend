import { addDays, fromIsoDate } from '../../../../shared/local-date';
import type { DayCell } from '../../../coach/coach-program-editor/program-days';
import { initialSetTargets } from './personal-prescriptions';
import type { PersonalProgramDay } from '../../../../models/personal-program.model';
import type { CoachExerciseSearchItem } from '../../../../models/coach-workspace.model';
import type { PersonalProgramState } from './personal-program-state';

/** Day and exercise mutations, picker selection and translated exercise names. */
export class PersonalProgramDays {
  constructor(private readonly state: PersonalProgramState) {}

  private readonly dayKeys = new WeakMap<PersonalProgramDay, number>();
  private nextDayKey = 0;
  key(day: PersonalProgramDay): number {
    if (!this.dayKeys.has(day)) this.dayKeys.set(day, this.nextDayKey++);
    return this.dayKeys.get(day)!;
  }

  selectedDay = 1;
  pickerDay: PersonalProgramDay | null = null;

  get visibleDays(): PersonalProgramDay[] {
    return this.state.standaloneMode
      ? this.state.model.workouts
      : this.state.model.workouts.filter((day) => day.dayIndex === this.selectedDay);
  }

  get cells(): DayCell[] {
    const start = this.state.model.startDate ? fromIsoDate(this.state.model.startDate) : null;
    const count = Math.min(
      366,
      Math.max(1, Math.floor(Number(this.state.model.durationDays) || 1)),
    );
    return Array.from({ length: count }, (_, index) => {
      const day = index + 1;
      const workout = this.state.model.workouts.find((item) => item.dayIndex === day);
      return {
        day,
        date: start ? addDays(start, index) : null,
        link: null,
        label: workout?.name ?? '',
        workout: workout
          ? {
              programWorkoutId: day,
              workoutId: day,
              name: workout.name,
              description: workout.description,
              exercises: workout.exercises.map((exercise) => ({
                id: exercise.exerciseId,
                name: this.names[exercise.exerciseId] ?? '',
                description: null,
                sets: exercise.sets,
                repetitions: exercise.repetitions,
                restSeconds: exercise.restSeconds,
                notes: exercise.notes,
              })),
            }
          : null,
      };
    });
  }

  selectDay(day: number): void {
    if (this.state.busy || day < 1 || day > this.state.model.durationDays) return;
    this.selectedDay = day;
    this.pickerDay = null;
  }

  addSelectedDay(): void {
    if (
      this.state.locked ||
      this.state.standaloneMode ||
      this.visibleDays.length ||
      this.selectedDay < 1 ||
      this.selectedDay > this.state.model.durationDays
    )
      return;
    this.state.model.workouts.push({
      dayIndex: this.selectedDay,
      name: '',
      description: null,
      exercises: [],
    });
    this.state.changed();
  }

  repeatWeekly(day: PersonalProgramDay): void {
    if (this.state.locked || this.state.standaloneMode) return;
    const used = new Set(this.state.model.workouts.map((item) => item.dayIndex));
    const targets: number[] = [];
    for (let index = day.dayIndex + 7; index <= this.state.model.durationDays; index += 7) {
      if (!used.has(index)) targets.push(index);
    }
    const exercises = this.state.model.workouts.reduce(
      (sum, item) => sum + item.exercises.length,
      0,
    );
    const sets = this.state.model.workouts
      .flatMap((item) => item.exercises)
      .reduce((sum, item) => sum + item.sets, 0);
    const addedSets = day.exercises.reduce((sum, item) => sum + item.sets, 0);
    if (
      exercises + targets.length * day.exercises.length > 1000 ||
      sets + targets.length * addedSets > 5000
    ) {
      this.state.message = 'personalPrograms.sizeLimit';
      this.state.messageType = 'error';
      return;
    }
    for (const dayIndex of targets)
      this.state.model.workouts.push(structuredClone({ ...day, dayIndex }));
    if (targets.length) this.state.changed();
  }

  names: Record<number, string> = {};

  catalogueFailed = false;

  get chosenIds(): number[] {
    return this.pickerDay?.exercises.map((e) => e.exerciseId) ?? [];
  }

  addDay(): void {
    if (this.state.standaloneMode || this.state.locked || this.state.model.workouts.length >= 366)
      return;
    const used = new Set(this.state.model.workouts.map((day) => day.dayIndex));
    let index = 1;
    while (used.has(index) && index <= this.state.model.durationDays) index++;
    if (index > this.state.model.durationDays) {
      this.state.message = 'personalPrograms.noFreeDay';
      this.state.messageType = 'info';
      return;
    }
    this.selectedDay = index;
    this.pickerDay = null;
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
    const added = {
      exerciseId: exercise.id,
      sets: 3,
      repetitions: 10,
      restSeconds: 60,
      notes: null,
    };
    this.pickerDay.exercises.push({ ...added, setTargets: initialSetTargets(added) });
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
