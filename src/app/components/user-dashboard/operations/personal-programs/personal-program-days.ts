import { addDays, fromIsoDate, calendarDaysBetween } from '../../../../shared/local-date';
import type { DayCell } from '../../../coach/coach-program-editor/program-days';
import { initialSetTargets } from './personal-prescriptions';
import type { PersonalWorkoutSchedule } from '../../../../models/personal-program.model';
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
  /** Populated only for an already started personal program. */
  schedules: PersonalWorkoutSchedule[] | null = null;

  /** Translate a stable template day index to the actual execution's date in this plan. */
  displayIndexFor(sourceDayIndex: number): number {
    const start = this.state.model.startDate;
    const scheduled = this.schedules?.find(row => row.dayIndex === sourceDayIndex);
    if (!this.state.started || !start || !scheduled?.scheduledAt) return sourceDayIndex;
    const movedIndex = calendarDaysBetween(fromIsoDate(start), fromIsoDate(scheduled.scheduledAt));
    return movedIndex < 0 || movedIndex >= this.state.model.durationDays
      ? sourceDayIndex : movedIndex + 1;
  }

  pickerDay: PersonalProgramDay | null = null;

  get visibleDays(): PersonalProgramDay[] {
    return this.state.standaloneMode
      ? this.state.model.workouts
      : this.state.model.workouts.filter((day) => this.displayIndexFor(day.dayIndex) === this.selectedDay);
  }

  get cells(): DayCell[] {
    const start = this.state.model.startDate ? fromIsoDate(this.state.model.startDate) : null;
    const count = Math.min(
      366,
      Math.max(1, Math.floor(Number(this.state.model.durationDays) || 1)),
    );
    // Build the lookup once per calendar derivation. Previously each of the up to
    // 366 cells scanned the workouts, and every workout scanned the schedules.
    // Keep first-match semantics for duplicate/invalid draft day indexes.
    const schedulesByDayIndex = new Map<number, PersonalWorkoutSchedule>();
    for (const schedule of this.schedules ?? []) {
      if (!schedulesByDayIndex.has(schedule.dayIndex)) schedulesByDayIndex.set(schedule.dayIndex, schedule);
    }
    const workoutsByDisplayIndex = new Map<number, PersonalProgramDay>();
    for (const workout of this.state.model.workouts) {
      let displayIndex = workout.dayIndex;
      const scheduled = schedulesByDayIndex.get(workout.dayIndex);
      if (this.state.started && start && scheduled?.scheduledAt) {
        const movedIndex = calendarDaysBetween(start, fromIsoDate(scheduled.scheduledAt));
        displayIndex = movedIndex < 0 || movedIndex >= this.state.model.durationDays
          ? workout.dayIndex : movedIndex + 1;
      }
      if (!workoutsByDisplayIndex.has(displayIndex)) workoutsByDisplayIndex.set(displayIndex, workout);
    }
    return Array.from({ length: count }, (_, index) => {
      const day = index + 1;
      const workout = workoutsByDisplayIndex.get(day);
      return {
        day,
        date: start ? addDays(start, index) : null,
        link: null,
        label: workout?.name ?? '',
        workout: workout
          ? {
              programWorkoutId: workout.dayIndex,
              workoutId: workout.dayIndex,
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

  /** Safe for every draft: the destination must be empty, and the copy is independent. */
  copyDay(source: PersonalProgramDay, dayIndex: number): boolean {
    if (this.state.locked || this.state.standaloneMode ||
        !Number.isInteger(this.state.model.durationDays) ||
        this.state.model.durationDays < 1 || this.state.model.durationDays > 366 ||
        !this.state.model.workouts.includes(source) ||
        !Number.isInteger(source.dayIndex) || source.dayIndex < 1 ||
        source.dayIndex > this.state.model.durationDays ||
        this.state.model.workouts.some(day => day !== source && day.dayIndex === source.dayIndex) ||
        !Number.isInteger(dayIndex) || dayIndex < 1 || dayIndex > this.state.model.durationDays ||
        this.state.model.workouts.some(day => day.dayIndex === dayIndex)) {
      this.state.message = 'personalEditorUi.copyInvalidDay';
      this.state.messageType = 'error';
      return false;
    }
    const exercises = this.state.model.workouts.reduce((sum, day) => sum + day.exercises.length, 0);
    const sets = this.state.model.workouts.flatMap(day => day.exercises)
      .reduce((sum, exercise) => sum + exercise.sets, 0);
    if (exercises + source.exercises.length > 1000 ||
        sets + source.exercises.reduce((sum, exercise) => sum + exercise.sets, 0) > 5000) {
      this.state.message = 'personalPrograms.sizeLimit';
      this.state.messageType = 'error';
      return false;
    }
    this.state.model.workouts.push(structuredClone({ ...source, dayIndex }));
    this.state.changed();
    this.state.message = 'personalEditorUi.dayCopied';
    this.state.messageType = 'info';
    return true;
  }

  get freeDays(): number[] {
    const used = new Set(this.state.model.workouts.map(day => this.displayIndexFor(day.dayIndex)));
    const count = Math.min(366, Math.max(0, Math.floor(this.state.model.durationDays) || 0));
    return Array.from({ length: count }, (_, index) => index + 1)
      .filter(day => !used.has(day));
  }

  get weeklyAvailable(): number[] {
    const source = this.state.model.workouts.find(day => day.dayIndex === this.selectedDay);
    if (!source) return [];
    const occupied = new Set(this.state.model.workouts.map(day => day.dayIndex));
    const result: number[] = [];
    for (let day = source.dayIndex + 7; day <= this.state.model.durationDays && day <= 366; day += 7)
      if (!occupied.has(day)) result.push(day);
    return result;
  }

  get weeklySkipped(): number {
    const source = this.state.model.workouts.find(day => day.dayIndex === this.selectedDay);
    if (!source) return 0;
    const occupied = new Set(this.state.model.workouts.map(day => day.dayIndex));
    let skipped = 0;
    for (let day = source.dayIndex + 7; day <= this.state.model.durationDays && day <= 366; day += 7)
      if (occupied.has(day)) skipped++;
    return skipped;
  }

  repeatWeekly(day: PersonalProgramDay): void {
    if (this.state.locked || this.state.standaloneMode) return;
    // Validate before building target days: an invalid, very large duration must
    // never turn a draft input into an unbounded synchronous loop.
    if (!Number.isInteger(this.state.model.durationDays) ||
        this.state.model.durationDays < 1 || this.state.model.durationDays > 366) {
      this.state.message = 'personalPrograms.flow.checkFields';
      this.state.messageType = 'error';
      return;
    }
    if (!Number.isInteger(day.dayIndex) || day.dayIndex < 1 ||
        day.dayIndex > this.state.model.durationDays ||
        !this.state.model.workouts.includes(day) ||
        this.state.model.workouts.some(other => other !== day && other.dayIndex === day.dayIndex)) {
      this.state.message = 'personalPrograms.invalidDays';
      this.state.messageType = 'error';
      return;
    }
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
    this.state.message = targets.length ? 'personalEditorUi.weeklyCopied' : 'personalEditorUi.noWeeklySlots';
    this.state.messageType = 'info';
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
