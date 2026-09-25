import { Component, EventEmitter, Input, Output } from '@angular/core';
import { SHARED_IMPORTS } from '../../../shared/shared-imports';
import { WorkoutDto } from '../../../../models/exercise.model';

@Component({
  selector: 'app-workout-copy-dialog',
  standalone: true,
  imports: [...SHARED_IMPORTS],
  templateUrl: './workout-copy-dialog.component.html',
})
export class WorkoutCopyDialogComponent {
  @Input() sourceWorkout: WorkoutDto | null = null;
  @Input() workoutName = '';
  @Output() workoutNameChange = new EventEmitter<string>();
  @Input() workoutDate = '';
  @Output() workoutDateChange = new EventEmitter<string>();
  @Input() dayIndex = 1;
  @Output() dayIndexChange = new EventEmitter<number>();
  @Input() inProgress = false;

  @Output() cancel = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<void>();
}
