import { Component, EventEmitter, Input, Output, model } from '@angular/core';

import { AppInputDirective } from '../../../shared/components/form-controls/app-input.directive';
import { AppRadioDirective } from '../../../shared/components/form-controls/app-check.directive';

import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { AppIconComponent } from '../../../shared/components/app-icon/app-icon.component';
import type {
  CoachExerciseSearchItem,
  CoachWorkoutSummary,
} from '../../../../models/coach-workspace.model';
import { ExercisePickerComponent } from '../../exercise-picker/exercise-picker.component';

/** Üres nap: új edzés összeállítása vagy edzés az Edzéstárból (hozzárendelés vagy másolat). */
@Component({
  selector: 'app-program-empty-day',
  standalone: true,
  imports: [
    AppInputDirective,
    AppRadioDirective,
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
  private static nextId = 0;
  readonly tabsId = `empty-day-${ProgramEmptyDayComponent.nextId++}`;
  @Input() pendingExercises: CoachExerciseSearchItem[] = [];
  @Input() pendingIds: number[] = [];
  @Input() busy = false;
  @Input() recoveryWorkout: { id: number; name: string } | null = null;
  @Input() hasLibrary = false;
  @Input() libraryWorkouts: CoachWorkoutSummary[] = [];
  @Input() programWorkoutIds: ReadonlySet<number> = new Set();
  @Input() copySourceId: number | null = null;

  readonly emptyMode = model<'new' | 'library'>('new');
  readonly workoutName = model('');
  readonly libraryFilter = model('');

  onTabKeydown(event: KeyboardEvent): void {
    let next: 'new' | 'library';
    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowRight':
        next = this.emptyMode() === 'new' ? 'library' : 'new';
        break;
      case 'Home': next = 'new'; break;
      case 'End': next = 'library'; break;
      default: return;
    }
    event.preventDefault();
    this.emptyMode.set(next);
    (event.currentTarget as HTMLElement).querySelector<HTMLElement>(`#${this.tabsId}-tab-${next}`)?.focus();
  }

  @Output() readonly removePending = new EventEmitter<number>();
  @Output() readonly addPending = new EventEmitter<CoachExerciseSearchItem>();
  @Output() readonly create = new EventEmitter<void>();
  @Output() readonly copySourceChange = new EventEmitter<number | null>();
  @Output() readonly link = new EventEmitter<void>();
  @Output() readonly copyToDay = new EventEmitter<void>();
}
