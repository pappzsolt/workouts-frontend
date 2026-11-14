import { Component, EventEmitter, Input, Output, model } from '@angular/core';

import { AppInputDirective } from '../../../shared/components/form-controls/app-input.directive';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { AppIconComponent } from '../../../shared/components/app-icon/app-icon.component';
import type { CoachClientOverview, CoachProgramWorkout } from '../../../../models/coach-workspace.model';
import type { EditableExercise } from '../program-days';

/**
 * A kiválasztott nap gyakorlatlistája és az edzéssel kapcsolatos műveletek.
 */
@Component({
  selector: 'app-program-day-workout',
  standalone: true,
  imports: [AppInputDirective, CommonModule, RouterModule, FormsModule, TranslatePipe, AppIconComponent],
  templateUrl: './program-day-workout.component.html',
  host: { class: 'contents' },
})
export class ProgramDayWorkoutComponent {
  @Input({ required: true }) workout!: CoachProgramWorkout;
  @Input() rows: EditableExercise[] = [];
  @Input() selectedWorkoutDayCount = 0;
  @Input() selectedDayClients: { client: CoachClientOverview; programWorkoutId: number }[] = [];
  @Input() programId: number | null = null;
  @Input() busy = false;
  @Input() weeklyRepeatDays: number[] = [];
  @Input() weeklyRepeatSkipped = 0;
  @Input() firstDate = '';
  @Input() lastDate = '';
  @Input() moveTargetIsSameDay = false;

  readonly confirmRepeat = model(false);
  readonly confirmRemove = model(false);
  readonly extraDate = model('');
  readonly moveDate = model('');

  @Output() readonly copyToLibrary = new EventEmitter<void>();
  @Output() readonly repeatWeekly = new EventEmitter<void>();
  @Output() readonly addToAnotherDay = new EventEmitter<void>();
  @Output() readonly moveWorkout = new EventEmitter<void>();
  @Output() readonly removeWorkout = new EventEmitter<void>();
}
