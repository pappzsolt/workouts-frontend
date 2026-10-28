import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { takeUntil } from 'rxjs';
import type { CoachWorkspaceService } from '../../../services/coach/coach-workspace.service';
import type { ClientDetailEffects } from './client-detail-effects';
import type { ClientWorkoutEntry } from './client-plan';

/** Owns the edited workout date and its rescheduling request. */
export class ClientWorkoutSchedule {
  rescheduleDate = '';

  constructor(
    private readonly workspace: Pick<CoachWorkspaceService, 'rescheduleWorkout'>,
    private readonly effects: ClientDetailEffects,
    private readonly onRescheduled: (userWorkoutId: number) => void,
  ) {}

  reset(): void {
    this.rescheduleDate = '';
  }

  reschedule(workout: ClientWorkoutEntry | null): void {
    if (!workout || !this.rescheduleDate || this.rescheduleDate === workout.date) return;
    const id = workout.userWorkoutId;
    this.workspace
      .rescheduleWorkout(id, this.rescheduleDate)
      .pipe(takeUntil(this.effects.cancelled$), takeUntilDestroyed(this.effects.destroyRef))
      .subscribe({
        next: () => {
          this.effects.showMessage('coachWorkspace.client.rescheduled', 'success');
          this.onRescheduled(id);
        },
        error: (error) => this.effects.showError(error, 'coachWorkspace.client.rescheduleError'),
      });
  }
}
