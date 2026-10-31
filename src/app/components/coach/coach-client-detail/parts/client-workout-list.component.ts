import { Component, EventEmitter, Input, Output } from '@angular/core';

import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { AppStatusBadgeComponent } from '../../../shared/components/app-status-badge/app-status-badge.component';
import { type ClientWorkoutEntry, type WeekGroup, workoutStatus } from '../client-plan';

/** A program edzései hetekre bontva; a kiválasztott edzés kiemelve. */
@Component({
  selector: 'app-client-workout-list',
  standalone: true,
  imports: [CommonModule, TranslatePipe, AppStatusBadgeComponent],
  templateUrl: './client-workout-list.component.html',
  host: { class: 'contents' },
})
export class ClientWorkoutListComponent {
  @Input({ required: true }) weeks: WeekGroup[] = [];
  @Input() selectedId: number | null = null;
  @Input({ required: true }) today = '';

  @Output() readonly workoutSelected = new EventEmitter<number>();

  status(workout: ClientWorkoutEntry) {
    return workoutStatus(workout, this.today);
  }
}
