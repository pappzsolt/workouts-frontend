import { CommonModule } from '@angular/common';
import { Component, DestroyRef, Input, OnChanges, SimpleChanges, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule, NgForm } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { AppInputDirective } from '../../../shared/components/form-controls/app-input.directive';
import { AppTextareaDirective } from '../../../shared/components/form-controls/app-textarea.directive';
import { AppEmptyStateComponent } from '../../../shared/components/app-state/app-state.component';
import { ExercisePickerComponent } from '../../../coach/exercise-picker/exercise-picker.component';
import type { CoachExerciseSearchItem } from '../../../../models/coach-workspace.model';
import type { PersonalProgramDay, PersonalProgramExercise, PersonalDayTargets } from '../../../../models/personal-program.model';
import { PersonalProgramService } from '../../../../services/user/personal-program.service';
import { PersonalExerciseTargetsComponent } from './personal-exercise-targets.component';
import { PersonalProgramCalendarComponent } from './personal-program-calendar.component';
import { PersonalMoveDatePickerComponent, PersonalMoveDateOption } from './personal-move-date-picker.component';
import type { PersonalProgramState } from './personal-program-state';
import type { PersonalProgramDays } from './personal-program-days';
import type { PersonalProgramActions } from './personal-program-actions';
import { initialSetTargets, syncExercisePrescription, validPersonalPrescriptions } from './personal-prescriptions';
import { WORKOUT_PRESCRIPTION_LIMITS } from '../../../../models/workout-prescription-limits';
import { addDays, fromIsoDate, toIsoDate } from '../../../../shared/local-date';
import { programDayDate, programDayIndex, programEndDate } from '../../../../shared/program-date';

/** Shared personal program and standalone workout presentation; all mutations and persistence remain in existing handlers. */
@Component({
  selector: 'app-personal-program-flow',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, AppInputDirective, AppTextareaDirective,
    AppEmptyStateComponent, ExercisePickerComponent, PersonalExerciseTargetsComponent,
    PersonalProgramCalendarComponent, PersonalMoveDatePickerComponent],
  templateUrl: './personal-program-flow.component.html',
})
export class PersonalProgramFlowComponent implements OnChanges {
  @Input({ required: true }) state!: PersonalProgramState;
  @Input({ required: true }) days!: PersonalProgramDays;
  @Input({ required: true }) actions!: PersonalProgramActions;
  @Input() scheduleProgramId: number | null = null;
  @Input() scheduleStarted = false;

  private readonly service = inject(PersonalProgramService);
  private readonly destroyRef = inject(DestroyRef);

  scheduleLoading = false;
  scheduleFailed = false;
  /** Ignore older schedule responses once a newer read or a write has started. */
  private scheduleRequestSequence = 0;
  moveDestination: number | null = null;
  confirmWeekly = false;
  copyDestination: number | null = null;
  copySource: number | null = null;

  /** Started program: separate execution data, never mutate the immutable template. */
  targetSession: PersonalDayTargets | null = null;
  targetDay: PersonalProgramDay | null = null;
  targetLoading = false;
  startedPickerOpen = false;
  get startedChosenIds(): number[] { return this.targetDay?.exercises.map(exercise => exercise.exerciseId) ?? []; }
  get targetDirty(): boolean { return this.state.executionTargetsDirty; }
  /** A previously started target GET must not replace newer edits or versions. */
  private targetRequestSequence = 0;


  view: 'calendar' | 'day' | 'exercise' = 'calendar';
  exerciseIndex = 0;

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['scheduleProgramId'] && !changes['scheduleStarted']) return;
    ++this.scheduleRequestSequence;
    ++this.targetRequestSequence;
    this.targetLoading = false;
    this.days.schedules = null;
    this.scheduleLoading = false;
    this.scheduleFailed = false;
    this.moveDestination = null;
    if (this.scheduleStarted && !this.state.standaloneMode && this.scheduleProgramId != null) {
      this.loadSchedules();
    }
  }

  loadSchedules(): void {
    const id = this.scheduleProgramId;
    if (id == null || !this.scheduleStarted || this.state.standaloneMode) return;
    const requestSequence = ++this.scheduleRequestSequence;
    this.scheduleLoading = true;
    this.scheduleFailed = false;
    this.service.schedule(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: schedules => {
        if (this.scheduleProgramId !== id || requestSequence !== this.scheduleRequestSequence) return;
        const previouslySelectedDay = this.days.selectedDay;
        const firstLoad = this.days.schedules == null;
        this.days.schedules = schedules;
        // Keep the initially selected workout visible if it was moved before this page opened.
        if (firstLoad && !this.days.visibleDays.length &&
            this.state.model.workouts.some(day => day.dayIndex === previouslySelectedDay)) {
          this.days.selectedDay = this.days.displayIndexFor(previouslySelectedDay);
        }
        this.scheduleLoading = false;
      },
      error: () => {
        if (this.scheduleProgramId !== id || requestSequence !== this.scheduleRequestSequence) return;
        this.scheduleLoading = false;
        this.scheduleFailed = true;
      },
    });
  }

  get selectedExecutionSchedule() {
    const day = this.activeDay;
    return day ? this.days.schedules?.find(item => item.dayIndex === day.dayIndex) ?? null : null;
  }

  /** All empty days inside this program are valid, including earlier or past days. */
  get availableMoveDays(): number[] {
    return this.days.freeDays;
  }

  /** Open the picker on the currently selected workout's month. */
  get moveContextDate(): Date | null {
    const start = this.state.model.startDate;
    return start ? addDays(fromIsoDate(start), this.days.selectedDay - 1) : null;
  }

  get availableMoveDates(): PersonalMoveDateOption[] {
    const start = this.state.model.startDate;
    if (!start) return [];
    const firstDay = fromIsoDate(start);
    return this.availableMoveDays.map(dayIndex => ({ dayIndex, date: addDays(firstDay, dayIndex - 1) }));
  }

  moveSelectedDay(): void {
    const id = this.scheduleProgramId;
    const source = this.activeDay;
    const execution = this.selectedExecutionSchedule;
    const destination = this.moveDestination;
    if (id == null || !this.state.started || this.state.standaloneMode ||
        this.state.busy || this.targetDirty || !source || !execution?.editable ||
        destination == null || !this.availableMoveDays.includes(destination) ||
        !this.state.model.startDate) return;
    const scheduledAt = toIsoDate(addDays(fromIsoDate(this.state.model.startDate), destination - 1));
    // An older GET must never replace the schedule returned by this write.
    ++this.scheduleRequestSequence;
    this.scheduleLoading = false;
    this.scheduleFailed = false;
    this.state.busy = true;
    this.service.moveDay(id, source.dayIndex, scheduledAt, execution.version)
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: schedules => {
          this.state.busy = false;
          this.days.schedules = schedules;
          this.days.selectedDay = destination;
          this.moveDestination = null;
          ++this.targetRequestSequence;
          this.targetLoading = false;
          this.targetSession = null;
          this.targetDay = null;
          this.state.message = 'personalEditorUi.moveSuccess';
          this.state.messageType = 'success';
        },
        error: error => {
          this.state.busy = false;
          this.state.fail(error);
          // Another tab may have moved this day. Refresh rather than guessing its location.
          this.loadSchedules();
        },
      });
  }

  private editingDay: PersonalProgramDay | null = null;

  get activeDay(): PersonalProgramDay | null {
    // Keep the same draft open while its day number is temporarily invalid or duplicated.
    if (this.view !== 'calendar' && this.editingDay && this.state.model.workouts.includes(this.editingDay))
      return this.editingDay;
    return this.days.visibleDays[0] ?? null;
  }

  get invalidDays(): PersonalProgramDay[] {
    if (this.state.standaloneMode) return [];
    return this.state.model.workouts.filter(day =>
      !Number.isInteger(day.dayIndex) || day.dayIndex < 1 || day.dayIndex > this.state.model.durationDays ||
      this.state.model.workouts.some(other => other !== day && other.dayIndex === day.dayIndex),
    );
  }

  editInvalidDay(day: PersonalProgramDay): void {
    if (this.state.busy || !this.state.model.workouts.includes(day)) return;
    this.editingDay = day;
    this.days.selectedDay = day.dayIndex;
    this.days.pickerDay = null;
    this.view = 'day';
  }
  get activeExercise(): PersonalProgramExercise | null {
    return (this.state.started && !this.state.standaloneMode
      ? this.targetDay?.exercises : this.activeDay?.exercises)?.[this.exerciseIndex] ?? null;
  }

  get dayForDisplay(): PersonalProgramDay | null {
    return this.state.started && !this.state.standaloneMode ? this.targetDay : this.activeDay;
  }

  get availableSources(): PersonalProgramDay[] {
    return this.state.model.workouts.filter(day => day.dayIndex !== this.days.selectedDay);
  }

  private loadStartedTargets(day: PersonalProgramDay): void {
    const id = this.state.id;
    if (id == null) return;
    const requestSequence = ++this.targetRequestSequence;
    this.targetSession = null;
    this.targetDay = null;
    this.targetLoading = true;
    const dayIndex = day.dayIndex;
    this.service.dayTargets(id, dayIndex).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (result) => {
        if (requestSequence !== this.targetRequestSequence ||
            this.state.id !== id || this.activeDay?.dayIndex !== dayIndex) return;
        this.targetLoading = false;
        if (!result || !Array.isArray(result.exercises) || result.exercises.length < 1 ||
            result.exercises.length > 100 ||
            result.exercises.some((exercise, index) => !exercise ||
              exercise.exerciseIndex !== index || !Number.isInteger(exercise.userExerciseId) ||
              !Number.isInteger(exercise.exerciseId) || !Array.isArray(exercise.sets) ||
              exercise.sets.length < 1 || exercise.sets.length > WORKOUT_PRESCRIPTION_LIMITS.maxSets ||
              exercise.sets.some(set => !set || typeof set !== 'object')) ||
            new Set(result.exercises.map(exercise => exercise.userExerciseId)).size !== result.exercises.length) {
          this.state.message = 'personalEditorUi.targetsLoadFailed';
          this.state.messageType = 'error';
          return;
        }
        const copy = structuredClone(day);
        // An execution can have newly added, replaced or removed exercises.
        // The original program template is never used as the source of truth.
        copy.exercises = result.exercises.map(exercise => {
          const source = day.exercises.find(row => row.exerciseId === exercise.exerciseId);
          const first = exercise.sets[0];
          const target: PersonalProgramExercise = source ? structuredClone(source) : {
            exerciseId: exercise.exerciseId, sets: exercise.sets.length,
            repetitions: first.targetRepetitions, restSeconds: first.restSeconds, notes: null,
          };
          const old = source?.setTargets ?? [];
          target.setTargets = exercise.sets.map((set, index) => ({
            ...set, notes: old[index]?.notes ?? target.notes,
          }));
          target.userExerciseId = exercise.userExerciseId;
          target.executionEditable = exercise.editable;
          syncExercisePrescription(target);
          return target;
        });
        this.targetDay = copy;
        this.targetSession = result;
      },
      error: (error: unknown) => {
        if (requestSequence !== this.targetRequestSequence ||
            this.state.id !== id || this.activeDay?.dayIndex !== dayIndex) return;
        this.targetLoading = false;
        this.state.fail(error);
      },
    });
  }

  discardTargets(): void {
    if (this.state.busy || !this.state.started || !this.targetDay) return;
    this.state.executionTargetsDirty = false;
    const source = this.activeDay;
    if (source) this.loadStartedTargets(source);
  }

  targetChanged(): void {
    if (!this.targetSession?.editable || !this.targetDay || this.state.busy) return;
    this.state.executionTargetsDirty = true;
    this.state.message = '';
  }

  saveTargets(): void {
    const id = this.state.id;
    const target = this.targetDay;
    const session = this.targetSession;
    if (id == null || !target || !session || !session.editable || !this.targetDirty || this.state.busy) return;
    if (!validPersonalPrescriptions({ ...this.state.model, workouts: [target] })) {
      this.state.message = 'personalPrograms.invalidTargets';
      this.state.messageType = 'error';
      return;
    }
    const exercises = target.exercises.map((exercise, exerciseIndex) => ({
      exerciseIndex,
      userExerciseId: exercise.userExerciseId ?? null,
      exerciseId: exercise.exerciseId,
      sets: (exercise.setTargets ?? []).map(row => ({
        targetRepetitions: row.targetRepetitions,
        targetWeightKg: row.targetWeightKg,
        restSeconds: row.restSeconds,
        targetRpe: row.targetRpe,
      })),
    }));
    this.state.busy = true;
    this.service.updateDayTargets(id, session.dayIndex, {
      expectedVersion: session.version, exercises,
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (saved) => {
        this.state.busy = false;
        // A successful HTTP response is not enough: the server must retain
        // the new set counts. Never display "saved" for a silently rejected edit.
        if (!saved?.exercises || saved.exercises.length !== exercises.length ||
            exercises.some(submitted => {
              const returned = saved.exercises.find(exercise => exercise.exerciseIndex === submitted.exerciseIndex);
              return !returned || returned.exerciseId !== submitted.exerciseId ||
                returned.sets.length !== submitted.sets.length;
            })) {
          this.state.message = 'personalEditorUi.targetsSaveMismatch';
          this.state.messageType = 'error';
          return;
        }
        this.targetSession = saved;
        saved.exercises.forEach((row, index) => {
          if (target.exercises[index]) {
            target.exercises[index].userExerciseId = row.userExerciseId;
            target.exercises[index].executionEditable = row.editable;
          }
        });
        this.state.executionTargetsDirty = false;
        this.state.message = 'personalEditorUi.targetsSaved';
        this.state.messageType = 'success';
      },
      error: (error: unknown) => {
        this.state.busy = false;
        this.state.fail(error);
      },
    });
  }

  copyWeekly(day: PersonalProgramDay): void {
    this.days.repeatWeekly(day);
    this.confirmWeekly = false;
  }

  copyToChosenDay(day: PersonalProgramDay): void {
    if (this.copyDestination != null && this.days.copyDay(day, this.copyDestination))
      this.copyDestination = null;
  }

  copyIntoSelectedDay(): void {
    const source = this.state.model.workouts.find(day => day.dayIndex === this.copySource);
    if (source && this.days.copyDay(source, this.days.selectedDay)) {
      this.copySource = null;
      this.openDay();
    }
  }

  hasDifferentTargets(exercise: PersonalProgramExercise): boolean {
    const targets = exercise.setTargets;
    const first = targets?.[0];
    return !!first && targets!.some(row =>
      row.targetRepetitions !== first.targetRepetitions || row.targetWeightKg !== first.targetWeightKg ||
      row.restSeconds !== first.restSeconds || row.targetRpe !== first.targetRpe || row.notes !== first.notes,
    );
  }

  get endDate(): string | null {
    return programEndDate(this.state.model.startDate, this.state.model.durationDays);
  }

  /** The date shown on a started program follows its execution, not its frozen draft index. */
  dayDate(day: PersonalProgramDay): string | null {
    const index = this.state.started ? this.days.displayIndexFor(day.dayIndex) : day.dayIndex;
    return programDayDate(this.state.model.startDate, index);
  }

  /** Drafts still save dayIndex; the form edits it using a human-readable calendar date. */
  changeDayDate(day: PersonalProgramDay, event: Event): void {
    const input = event.target as HTMLInputElement;
    const revert = () => { input.value = this.dayDate(day) ?? ''; };
    if (this.state.locked || this.state.standaloneMode || !this.state.model.workouts.includes(day)) {
      revert();
      return;
    }
    const index = programDayIndex(this.state.model.startDate, input.value);
    if (index === null || index < 1 || index > this.state.model.durationDays ||
        this.state.model.workouts.some(other => other !== day && other.dayIndex === index)) {
      this.state.message = 'personalEditorUi.dayDateInvalid';
      this.state.messageType = 'error';
      revert();
      return;
    }
    if (index !== day.dayIndex) {
      day.dayIndex = index;
      this.days.selectedDay = index;
      this.state.changed();
    }
  }

  get selectedDate(): Date | null {
    return this.days.cells.find(cell => cell.day === this.days.selectedDay)?.date ?? null;
  }
  get plannedDays(): number { return this.state.model.workouts.length; }
  get restDays(): number { return Math.max(0, this.state.model.durationDays - this.plannedDays); }

  selectDay(day: number): void {
    // A pending move/save owns the selected occurrence until its response settles.
    if (this.state.busy) return;
    if (this.state.started && this.targetDirty) {
      this.state.message = 'personalEditorUi.saveTargetsFirst';
      this.state.messageType = 'error';
      return;
    }
    this.days.selectDay(day);
    ++this.targetRequestSequence;
    this.targetLoading = false;
    this.editingDay = null;
    this.targetDay = null;
    this.targetSession = null;
    this.confirmWeekly = false;
    this.copyDestination = null;
    this.copySource = null;
    this.moveDestination = null;
  }

  openDay(): void {
    if (this.state.busy || (this.state.started && (this.scheduleLoading || this.scheduleFailed))) return;
    this.editingDay = this.activeDay;
    this.days.pickerDay = null;
    this.view = 'day';
    if (this.state.started && !this.state.standaloneMode && this.editingDay && !this.targetDirty)
      this.loadStartedTargets(this.editingDay);
  }

  createDay(): void {
    if (this.state.locked) return;
    this.days.addSelectedDay();
    this.openDay();
  }

  openExercise(index: number): void {
    if (!this.dayForDisplay || index < 0 || index >= this.dayForDisplay.exercises.length ||
        (this.state.started && !this.state.standaloneMode && !this.targetSession)) return;
    this.days.pickerDay = null;
    this.exerciseIndex = index;
    this.view = 'exercise';
  }

  nextExercise(direction: -1 | 1): void { this.openExercise(this.exerciseIndex + direction); }

  backToCalendar(): void {
    if (this.state.busy) return;
    if (this.targetDirty) {
      this.state.message = 'personalEditorUi.saveTargetsFirst';
      this.state.messageType = 'error';
      return;
    }
    ++this.targetRequestSequence;
    this.targetLoading = false;
    this.editingDay = null;
    this.days.pickerDay = null;
    this.startedPickerOpen = false;
    this.view = 'calendar';
  }

  backToDay(): void {
    if (this.state.busy) return;
    this.days.pickerDay = null;
    this.startedPickerOpen = false;
    this.view = 'day';
  }

  addStartedExercise(exercise: CoachExerciseSearchItem): void {
    const day = this.targetDay;
    if (!this.targetSession?.editable || !day || this.state.busy ||
        day.exercises.length >= 100 || day.exercises.some(row => row.exerciseId === exercise.id)) return;
    this.days.names[exercise.id] = exercise.name;
    const created: PersonalProgramExercise = {
      exerciseId: exercise.id, userExerciseId: null, executionEditable: true,
      sets: 3, repetitions: 10, restSeconds: 60, notes: null,
    };
    day.exercises.push({ ...created, setTargets: initialSetTargets(created) });
    this.startedPickerOpen = false;
    this.targetChanged();
    this.openExercise(day.exercises.length - 1);
  }

  removeStartedExercise(index: number): void {
    const day = this.targetDay;
    if (!this.targetSession?.editable || !day || day.exercises.length <= 1 ||
        !day.exercises[index]?.executionEditable || this.state.busy) return;
    day.exercises.splice(index, 1);
    this.targetChanged();
  }

  addExercise(exercise: CoachExerciseSearchItem): void {
    const day = this.days.pickerDay;
    const before = day?.exercises.length ?? 0;
    this.days.addExercise(exercise);
    if (day?.exercises.length === before + 1) this.openExercise(before);
  }

  removeDay(day: PersonalProgramDay): void {
    this.days.removeDay(day);
    this.backToCalendar();
  }

  save(form: NgForm): void {
    if (form.invalid) {
      form.control.markAllAsTouched();
      // Program metadata controls stay registered when navigating between screens.
      // Take the user back to them if they caused the invalid form.
      if (!this.state.model.name?.trim() || !Number.isInteger(this.state.model.durationDays) ||
          this.state.model.durationDays < 1 || this.state.model.durationDays > 366 ||
          (this.state.model.startDate && this.state.model.startDate < this.state.minimumStartDate)) {
        this.backToCalendar();
      } else if (this.view === 'exercise') {
        this.backToDay();
      }
      this.state.message = 'personalPrograms.flow.checkFields';
      this.state.messageType = 'error';
      return;
    }
    // Set target controls are local to each exercise screen; validate the entire draft,
    // then open the offending day/exercise instead of leaving the user on an unrelated day.
    for (const day of this.state.model.workouts) {
      const validateDay = this.state.standaloneMode ? { ...day, name: this.state.model.name } : day;
      if (validPersonalPrescriptions({ ...this.state.model, workouts: [validateDay] })) continue;
      this.editInvalidDay(day);
      const index = day.exercises.findIndex(exercise =>
        !validPersonalPrescriptions({
          ...this.state.model,
          workouts: [{ ...validateDay, name: 'validation', exercises: [exercise] }],
        }),
      );
      if (validateDay.name.trim() && index >= 0) this.openExercise(index);
      this.state.message = 'personalPrograms.invalidTargets';
      this.state.messageType = 'error';
      return;
    }
    this.actions.save(form);
  }
}
