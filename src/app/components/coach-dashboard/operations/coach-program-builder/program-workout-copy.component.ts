import { createInputValidationGuard } from '../../../shared/components/form-controls/app-input.directive';
import { Component, DestroyRef, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { errorMessage } from '../../../../models/backend-dto/common/api-response-message';
import { SHARED_IMPORTS } from '../../../shared/shared-imports';
import { WorkoutCopyDialogComponent } from './workout-copy-dialog.component';
import { CoachProgramBuilderWorkoutService } from '../../../../services/coach/coach-program-builder-workout.service';
import type { WorkoutWithExercises } from '../../../../models/exercise.model';

/** Copy form, validation and HTTP lifecycle belong to this dialog workflow. */
@Component({
  selector: 'app-program-workout-copy', standalone: true,
  imports: [...SHARED_IMPORTS, WorkoutCopyDialogComponent],
  template: `
    <app-workout-copy-dialog [sourceWorkout]="sourceWorkout" [(workoutName)]="name"
      [(workoutDate)]="date" [(dayIndex)]="dayIndex" [inProgress]="busy" [errorMessage]="message"
      (cancel)="close.emit()" (confirm)="confirm()"></app-workout-copy-dialog>
  `,
})
export class ProgramWorkoutCopyComponent implements OnInit {
  private readonly validateInputs = createInputValidationGuard();
  private readonly api = inject(CoachProgramBuilderWorkoutService);
  private readonly destroyRef = inject(DestroyRef);
  @Input() programId: number | null = null;
  @Input() sourceWorkout: WorkoutWithExercises | null = null;
  @Input() nextDayIndex = 1;
  @Output() readonly close = new EventEmitter<void>();
  @Output() readonly copied = new EventEmitter<string>();
  @Output() readonly failed = new EventEmitter<string>();
  name = '';
  date = '';
  dayIndex = 1;
  busy = false;
  message = '';

  ngOnInit(): void {
    this.name = `${this.sourceWorkout?.name ?? ''} - másolat`;
    this.date = this.sourceWorkout?.workoutDate ?? '';
    this.dayIndex = this.nextDayIndex;
  }

  confirm(): void {
    if (!this.validateInputs()) return;
    if (this.busy) return;
    if (!this.programId || !this.sourceWorkout) { this.fail('coachProgramBuilder.copyError'); return; }
    if (!this.name.trim()) { this.fail('coachProgramBuilder.copyNameRequired'); return; }
    if (!this.date) { this.fail('coachProgramBuilder.copyDateRequired'); return; }
    if (!Number.isInteger(this.dayIndex) || this.dayIndex < 1) { this.fail('coachProgramBuilder.invalidWorkoutDay'); return; }
    this.busy = true;
    this.api.copyWorkout({ sourceWorkoutId: this.sourceWorkout.id, programId: this.programId,
      workoutName: this.name.trim(), workoutDate: this.date, dayIndex: this.dayIndex })
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: response => {
          this.busy = false;
          if (!response.success || response.data === null) { this.fail(response.message || 'coachProgramBuilder.copyError'); return; }
          this.copied.emit(response.message || 'coachProgramBuilder.copySuccess');
          this.close.emit();
        },
        error: error => { this.busy = false; this.fail(errorMessage(error, 'coachProgramBuilder.copyError')); },
      });
  }
  private fail(message: string): void { this.message = message; this.failed.emit(message); }
}
