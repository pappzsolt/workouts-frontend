import { isIsoDateInRange } from '../../../shared/local-date';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, takeUntil } from 'rxjs';
import type { CoachWorkspaceService } from '../../../services/coach/coach-workspace.service';
import type { ClientDetailEffects } from './client-detail-effects';
import type { ClientWorkoutEntry } from './client-plan';

/** Owns the edited workout date and its rescheduling request. */
export class ClientWorkoutSchedule {
  rescheduleDate = '';
  saving = false;

  constructor(
    private readonly workspace: Pick<CoachWorkspaceService, 'rescheduleWorkout'>,
    private readonly effects: ClientDetailEffects,
    private readonly bounds: () => { startDate: string | null; endDate: string | null } | null,
    private readonly onRescheduled: (userWorkoutId: number) => void,
  ) {}

  reset(): void {
    this.rescheduleDate = '';
  }

  canReschedule(workout: ClientWorkoutEntry | null): workout is ClientWorkoutEntry {
    const bounds = this.bounds();
    return !this.saving && !!workout && this.rescheduleDate !== workout.date
      && isIsoDateInRange(this.rescheduleDate, bounds?.startDate, bounds?.endDate);
  }

  reschedule(workout: ClientWorkoutEntry | null): void {
    if (!this.canReschedule(workout)) return;
    const id = workout.userWorkoutId;
    this.saving = true;
    this.workspace
      .rescheduleWorkout(id, this.rescheduleDate)
      .pipe(takeUntil(this.effects.cancelled$), takeUntilDestroyed(this.effects.destroyRef), finalize(() => this.saving = false))
      .subscribe({
        next: () => {
          this.effects.showMessage('coachWorkspace.client.rescheduled', 'success');
          this.onRescheduled(id);
        },
        error: (error) => this.effects.showError(error, 'coachWorkspace.client.rescheduleError'),
      });
  }
}
