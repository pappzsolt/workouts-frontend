import { Component, EventEmitter, Input, Output, model } from '@angular/core';

import { AppInputDirective } from '../../../shared/components/form-controls/app-input.directive';
import { AppRadioDirective } from '../../../shared/components/form-controls/app-check.directive';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { AppIconComponent } from '../../../shared/components/app-icon/app-icon.component';
import type { CoachExerciseSearchItem, CoachWorkoutSummary } from '../../../../models/coach-workspace.model';
import { ExercisePickerComponent } from '../../exercise-picker/exercise-picker.component';

/** Üres nap: új edzés összeállítása vagy edzés az Edzéstárból (hozzárendelés vagy másolat). */
@Component({
  selector: 'app-program-empty-day',
  standalone: true,
  imports: [
    AppInputDirective,
    AppRadioDirective,
    CommonModule,
    RouterModule,
    FormsModule,
    TranslatePipe,
    AppIconComponent,
    ExercisePickerComponent,
  ],
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
