import { Component, EventEmitter, Input, Output, model } from '@angular/core';

import { AppInputDirective } from '../../../shared/components/form-controls/app-input.directive';
import { AppCheckboxDirective } from '../../../shared/components/form-controls/app-check.directive';
import { AppDialogComponent } from '../../../shared/components/app-dialog/app-dialog.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import type { CoachWorkoutSummary } from '../../../../models/coach-workspace.model';

/** Több edzés felvétele egyszerre az Edzéstárból, a kiválasztott naptól kezdve. */
@Component({
  selector: 'app-program-multi-add-dialog',
  standalone: true,
  imports: [
    AppInputDirective,
    AppCheckboxDirective,
    AppDialogComponent,
    CommonModule,
    FormsModule,
    TranslatePipe,
  ],
  templateUrl: './program-multi-add-dialog.component.html',
  host: { class: 'contents' },
})
export class ProgramMultiAddDialogComponent {
  @Input() selectedDay = 1;
  @Input() workouts: CoachWorkoutSummary[] = [];
  @Input() selected: number[] = [];
  @Input() targetDays: number[] = [];
  @Input() busy = false;

  readonly multiFilter = model('');

  @Output() readonly toggle = new EventEmitter<{ workoutId: number; checked: boolean }>();
  @Output() readonly dismissed = new EventEmitter<void>();
  @Output() readonly confirmed = new EventEmitter<void>();
}
