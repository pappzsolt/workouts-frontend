import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { AppInputDirective } from '../../../shared/components/form-controls/app-input.directive';
import { AppTextareaDirective } from '../../../shared/components/form-controls/app-textarea.directive';
import { AppEmptyStateComponent } from '../../../shared/components/app-state/app-state.component';
import { ExercisePickerComponent } from '../../../coach/exercise-picker/exercise-picker.component';
import type { CoachExerciseSearchItem } from '../../../../models/coach-workspace.model';
import type { PersonalProgramDay, PersonalProgramExercise } from '../../../../models/personal-program.model';
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
    return this.activeDay?.exercises[this.exerciseIndex] ?? null;
  }
  get selectedDate(): Date | null {
    return this.days.cells.find(cell => cell.day === this.days.selectedDay)?.date ?? null;
  }
  get plannedDays(): number { return this.state.model.workouts.length; }
  get restDays(): number { return Math.max(0, this.state.model.durationDays - this.plannedDays); }

  selectDay(day: number): void {
    this.days.selectDay(day);
    this.editingDay = null;
  }

  openDay(): void {
    this.editingDay = this.activeDay;
    this.days.pickerDay = null;
    this.view = 'day';
  }

  createDay(): void {
    if (this.state.locked) return;
    this.days.addSelectedDay();
    this.openDay();
  }

  openExercise(index: number): void {
    if (!this.activeDay || index < 0 || index >= this.activeDay.exercises.length) return;
    this.days.pickerDay = null;
    this.exerciseIndex = index;
    this.view = 'exercise';
  }

  nextExercise(direction: -1 | 1): void { this.openExercise(this.exerciseIndex + direction); }

  backToCalendar(): void {
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
