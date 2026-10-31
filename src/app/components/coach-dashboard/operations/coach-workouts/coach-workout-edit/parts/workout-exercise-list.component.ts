import { Component, EventEmitter, Input, Output } from '@angular/core';

import type { WorkoutExerciseView } from '../../../../../../models/workout/workout-exercise-view.model';
import { AppHeadingDirective } from '../../../../../shared/components/app-page-header/app-page-header.component';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { MessageComponent } from '../../../../../shared/components/message/message.component';
import { AppIconComponent } from '../../../../../shared/components/app-icon/app-icon.component';

/** Az edzés jelenlegi gyakorlatai; programon kívüli edzésnél sorrend és eltávolítás. */
@Component({
  selector: 'app-workout-exercise-list',
  standalone: true,
  imports: [AppHeadingDirective, CommonModule, TranslatePipe, MessageComponent, AppIconComponent],
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
