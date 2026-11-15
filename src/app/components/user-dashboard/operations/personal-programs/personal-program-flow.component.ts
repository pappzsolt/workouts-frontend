import { CommonModule } from '@angular/common';
import { Component, DestroyRef, Input, inject } from '@angular/core';
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

/** Shared personal program and standalone workout presentation; all mutations and persistence remain in existing handlers. */
@Component({
  selector: 'app-personal-program-flow',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, AppInputDirective, AppTextareaDirective,
    AppEmptyStateComponent, ExercisePickerComponent, PersonalExerciseTargetsComponent,
    PersonalProgramCalendarComponent],
  templateUrl: './personal-program-flow.component.html',
})
export class PersonalProgramFlowComponent {
  @Input({ required: true }) state!: PersonalProgramState;
  @Input({ required: true }) days!: PersonalProgramDays;
  @Input({ required: true }) actions!: PersonalProgramActions;

  private readonly service = inject(PersonalProgramService);
  private readonly destroyRef = inject(DestroyRef);

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
        if (this.state.id !== id || this.days.selectedDay !== dayIndex) return;
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
