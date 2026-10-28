import { Component, EventEmitter, Input, Output, model } from '@angular/core';

import { SHARED_IMPORTS } from '../../../shared/shared-imports';
import type { CoachExerciseSearchItem, CoachWorkoutSummary } from '../../../../models/coach-workspace.model';
import { ExercisePickerComponent } from '../../exercise-picker/exercise-picker.component';

/** Üres nap: új edzés összeállítása vagy edzés az Edzéstárból (hozzárendelés vagy másolat). */
@Component({
  selector: 'app-program-empty-day',
  standalone: true,
  imports: [...SHARED_IMPORTS, ExercisePickerComponent],
  templateUrl: './program-empty-day.component.html',
  host: { class: 'contents' },
})
export class ProgramEmptyDayComponent {
  @Input() pendingExercises: CoachExerciseSearchItem[] = [];
  @Input() pendingIds: number[] = [];
  @Input() busy = false;
  @Input() hasLibrary = false;
  @Input() libraryWorkouts: CoachWorkoutSummary[] = [];
  @Input() programWorkoutIds: ReadonlySet<number> = new Set();
  @Input() copySourceId: number | null = null;

  readonly emptyMode = model<'new' | 'library'>('new');
  readonly workoutName = model('');
  readonly libraryFilter = model('');

  @Output() readonly removePending = new EventEmitter<number>();
  @Output() readonly addPending = new EventEmitter<CoachExerciseSearchItem>();
  @Output() readonly create = new EventEmitter<void>();
  @Output() readonly copySourceChange = new EventEmitter<number | null>();
  @Output() readonly link = new EventEmitter<void>();
  @Output() readonly copyToDay = new EventEmitter<void>();
}
