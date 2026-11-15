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
import type { PersonalProgramState } from './personal-program-state';
import type { PersonalProgramDays } from './personal-program-days';
import type { PersonalProgramActions } from './personal-program-actions';
import { validPersonalPrescriptions } from './personal-prescriptions';
import { addDays, fromIsoDate, toIsoDate } from '../../../../shared/local-date';

/** Shared personal program and standalone workout presentation; all mutations and persistence remain in existing handlers. */
@Component({
  selector: 'app-personal-program-flow',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, AppInputDirective, AppTextareaDirective,
    AppEmptyStateComponent, ExercisePickerComponent, PersonalExerciseTargetsComponent,
    PersonalProgramCalendarComponent],
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
  moveDestination: number | null = null;
  confirmWeekly = false;
  copyDestination: number | null = null;
  copySource: number | null = null;

  /** Started program: separate execution data, never mutate the immutable template. */
  targetSession: PersonalDayTargets | null = null;
  targetDay: PersonalProgramDay | null = null;
  targetLoading = false;
  targetDirty = false;


  view: 'calendar' | 'day' | 'exercise' = 'calendar';
  exerciseIndex = 0;

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['scheduleProgramId'] && !changes['scheduleStarted']) return;
    this.days.schedules = null;
    this.moveDestination = null;
    if (this.scheduleStarted && !this.state.standaloneMode && this.scheduleProgramId != null) {
      this.loadSchedules();
    }
  }

  loadSchedules(): void {
    const id = this.scheduleProgramId;
    if (id == null || !this.scheduleStarted || this.state.standaloneMode) return;
    this.scheduleLoading = true;
    this.scheduleFailed = false;
    this.service.schedule(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: schedules => {
        if (this.scheduleProgramId !== id) return;
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
        if (this.scheduleProgramId !== id) return;
        this.scheduleLoading = false;
        this.scheduleFailed = true;
      },
    });
  }

  get selectedExecutionSchedule() {
    const day = this.activeDay;
    return day ? this.days.schedules?.find(item => item.dayIndex === day.dayIndex) ?? null : null;
  }

  get availableMoveDays(): number[] {
    return this.days.freeDays.filter(index => {
      const date = this.state.model.startDate
        ? toIsoDate(addDays(fromIsoDate(this.state.model.startDate), index - 1)) : null;
      return date != null && date >= this.state.minimumStartDate;
    });
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
    this.state.busy = true;
    this.service.moveDay(id, source.dayIndex, scheduledAt, execution.version)
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: schedules => {
          this.state.busy = false;
          this.days.schedules = schedules;
          this.days.selectedDay = destination;
          this.moveDestination = null;
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
    this.targetSession = null;
    this.targetDay = null;
    this.targetLoading = true;
    const dayIndex = day.dayIndex;
    this.service.dayTargets(id, dayIndex).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (result) => {
        if (this.state.id !== id || this.activeDay?.dayIndex !== dayIndex) return;
        this.targetLoading = false;
        const copy = structuredClone(day);
        // Each exercise is mapped only by its validated server-side order index.
        if (result.exercises.length !== copy.exercises.length ||
            result.exercises.some(exercise => exercise.exerciseIndex < 0 ||
              exercise.exerciseIndex >= copy.exercises.length ||
              exercise.sets.length !== copy.exercises[exercise.exerciseIndex].sets) ||
            new Set(result.exercises.map(exercise => exercise.exerciseIndex)).size !== result.exercises.length) {
          this.state.message = 'personalEditorUi.targetsLoadFailed';
          this.state.messageType = 'error';
          return;
        }
        for (const exercise of result.exercises) {
          const target = copy.exercises[exercise.exerciseIndex];
          const existing = target.setTargets ?? [];
          target.setTargets = exercise.sets.map((set, index) => ({
            ...set, notes: existing[index]?.notes ?? target.notes,
          }));
        }
        this.targetDay = copy;
        this.targetSession = result;
        this.targetDirty = false;
      },
      error: (error: unknown) => {
        this.targetLoading = false;
        this.state.fail(error);
      },
    });
  }

  discardTargets(): void {
    if (this.state.busy || !this.state.started || !this.targetDay) return;
    this.targetDirty = false;
    this.state.dirty = false;
    const source = this.activeDay;
    if (source) this.loadStartedTargets(source);
  }

  targetChanged(): void {
    if (!this.targetSession?.editable || !this.targetDay || this.state.busy) return;
    this.targetDirty = true;
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
    this.state.busy = true;
    this.service.updateDayTargets(id, session.dayIndex, {
      expectedVersion: session.version,
      exercises: target.exercises.map((exercise, exerciseIndex) => ({
        exerciseIndex,
        sets: (exercise.setTargets ?? []).map(row => ({
          targetRepetitions: row.targetRepetitions,
          targetWeightKg: row.targetWeightKg,
          restSeconds: row.restSeconds,
          targetRpe: row.targetRpe,
        })),
      })),
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (saved) => {
        this.state.busy = false;
        this.targetSession = saved;
        this.targetDirty = false;
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

  get selectedDate(): Date | null {
    return this.days.cells.find(cell => cell.day === this.days.selectedDay)?.date ?? null;
  }
  get plannedDays(): number { return this.state.model.workouts.length; }
  get restDays(): number { return Math.max(0, this.state.model.durationDays - this.plannedDays); }

  selectDay(day: number): void {
    if (this.state.started && this.targetDirty) {
      this.state.message = 'personalEditorUi.saveTargetsFirst';
      this.state.messageType = 'error';
      return;
    }
    this.days.selectDay(day);
    this.editingDay = null;
    this.targetDay = null;
    this.targetSession = null;
    this.confirmWeekly = false;
    this.copyDestination = null;
    this.copySource = null;
    this.moveDestination = null;
  }

  openDay(): void {
    this.editingDay = this.activeDay;
    this.days.pickerDay = null;
    this.view = 'day';
    if (this.state.started && !this.state.standaloneMode && this.editingDay)
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
    if (this.targetDirty) {
      this.state.message = 'personalEditorUi.saveTargetsFirst';
      this.state.messageType = 'error';
      return;
    }
    this.editingDay = null;
    this.days.pickerDay = null;
    this.view = 'calendar';
  }

  backToDay(): void {
    this.days.pickerDay = null;
    this.view = 'day';
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
