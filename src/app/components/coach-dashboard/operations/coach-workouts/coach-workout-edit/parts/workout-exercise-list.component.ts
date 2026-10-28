import { Component, EventEmitter, Input, Output } from '@angular/core';

import type { WorkoutExerciseView } from '../../../../../../models/workout/workout-exercise-view.model';
import { SHARED_IMPORTS } from '../../../../../shared/shared-imports';

/** Az edzés jelenlegi gyakorlatai; programon kívüli edzésnél sorrend és eltávolítás. */
@Component({
  selector: 'app-workout-exercise-list',
  standalone: true,
  imports: [...SHARED_IMPORTS],
  templateUrl: './workout-exercise-list.component.html',
  host: { class: 'contents' },
})
export class WorkoutExerciseListComponent {
  @Input({ required: true }) items: WorkoutExerciseView[] = [];
  /** Programban lévő edzés: a gyakorlatlista zárolt. */
  @Input() locked = false;
  @Input() busy = false;

  @Output() readonly move = new EventEmitter<{ index: number; direction: -1 | 1 }>();
  @Output() readonly remove = new EventEmitter<WorkoutExerciseView>();

  trackKey(index: number, item: WorkoutExerciseView): number | string {
    return item.id ?? `${item.exerciseId}-${item.orderIndex ?? index}`;
  }
}
