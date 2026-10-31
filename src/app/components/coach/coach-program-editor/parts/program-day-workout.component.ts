import { Component, EventEmitter, Input, Output, model } from '@angular/core';

import { AppInputDirective } from '../../../shared/components/form-controls/app-input.directive';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { AppIconComponent } from '../../../shared/components/app-icon/app-icon.component';
import { WORKOUT_PRESCRIPTION_LIMITS } from '../../../../models/workout-prescription-limits';
import type { CoachClientOverview, CoachProgramWorkout } from '../../../../models/coach-workspace.model';
import { EditableExercise, isPrescriptionChanged } from '../program-days';

/**
 * A kiválasztott nap edzése: előírt értékek szerkesztése, sorrend, mentés, és a nap
 * edzésével kapcsolatos műveletek. A sorok objektumait a szülő birtokolja.
 */
@Component({
  selector: 'app-program-day-workout',
  standalone: true,
  imports: [AppInputDirective, CommonModule, RouterModule, FormsModule, TranslatePipe, AppIconComponent],
  templateUrl: './program-day-workout.component.html',
  host: { class: 'contents' },
})
export class ProgramDayWorkoutComponent {
  readonly prescriptionLimits = WORKOUT_PRESCRIPTION_LIMITS;
  @Input({ required: true }) workout!: CoachProgramWorkout;
  @Input() rows: EditableExercise[] = [];
  @Input() selectedWorkoutDayCount = 0;
  @Input() selectedDayClients: { client: CoachClientOverview; date: string }[] = [];
  @Input() programId: number | null = null;
  @Input() busy = false;
  @Input() changedCount = 0;
  @Input() saveDisabled = false;
  @Input() weeklyRepeatDays: number[] = [];
  @Input() weeklyRepeatSkipped = 0;
  @Input() firstDate = '';
  @Input() lastDate = '';
  @Input() moveTargetIsSameDay = false;

  readonly confirmRepeat = model(false);
  readonly confirmRemove = model(false);
  readonly extraDate = model('');
  readonly moveDate = model('');

  @Output() readonly moveRow = new EventEmitter<{ index: number; direction: -1 | 1 }>();
  @Output() readonly applyTemplate = new EventEmitter<void>();
  @Output() readonly savePrescriptions = new EventEmitter<void>();
  @Output() readonly copyToLibrary = new EventEmitter<void>();
  @Output() readonly repeatWeekly = new EventEmitter<void>();
  @Output() readonly addToAnotherDay = new EventEmitter<void>();
  @Output() readonly moveWorkout = new EventEmitter<void>();
  @Output() readonly removeWorkout = new EventEmitter<void>();

  isChanged(row: EditableExercise): boolean {
    return isPrescriptionChanged(row);
  }
}
