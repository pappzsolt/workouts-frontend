import { Component, EventEmitter, Input, Output, model } from '@angular/core';

import { SHARED_IMPORTS } from '../../../shared/shared-imports';
import type { CoachWorkoutSummary } from '../../../../models/coach-workspace.model';

/** Több edzés felvétele egyszerre az Edzéstárból, a kiválasztott naptól kezdve. */
@Component({
  selector: 'app-program-multi-add-dialog',
  standalone: true,
  imports: [...SHARED_IMPORTS],
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
