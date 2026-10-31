import { Component, Input, OnChanges, OnDestroy, inject } from '@angular/core';
import { ReplaySubject, catchError, map, of, startWith, switchMap } from 'rxjs';
import type { PreviousExercisePerformance } from '../../../../../models/previous-exercise-performance.model';
import { UserExerciseDetailService } from '../../../../../services/user/user-exercises-detail/user-exercises-detail.service';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { AppButtonComponent } from '../../../../shared/components/app-button/app-button.component';

type HistoryState =
  | { status: 'loading' | 'error' | 'empty'; data?: never }
  | { status: 'ready'; data: PreviousExercisePerformance };

@Component({
  selector: 'app-previous-exercise-performance',
  standalone: true,
  imports: [CommonModule, TranslatePipe, AppButtonComponent],
  templateUrl: './previous-exercise-performance.component.html',
})
export class PreviousExercisePerformanceComponent implements OnChanges, OnDestroy {
  @Input({ required: true }) userWorkoutId!: number;
  @Input({ required: true }) exerciseId!: number;
  private readonly service = inject(UserExerciseDetailService);
  private readonly context$ = new ReplaySubject<{ userWorkoutId: number; exerciseId: number }>(1);

  readonly state$ = this.context$.pipe(
    switchMap(({ userWorkoutId, exerciseId }) =>
      this.service.getPreviousPerformance(userWorkoutId, exerciseId).pipe(
        map((response) => {
          if (!response.success) return { status: 'error' } as HistoryState;
          return response.data
            ? ({ status: 'ready', data: response.data } as HistoryState)
            : ({ status: 'empty' } as HistoryState);
        }),
        catchError(() => of<HistoryState>({ status: 'error' })),
        startWith<HistoryState>({ status: 'loading' }),
      ),
    ),
  );

  ngOnChanges(): void {
    this.reload();
  }

  reload(): void {
    if ([this.userWorkoutId, this.exerciseId].every((id) => Number.isInteger(id) && id > 0)) {
      this.context$.next({ userWorkoutId: this.userWorkoutId, exerciseId: this.exerciseId });
    }
  }

  ngOnDestroy(): void {
    this.context$.complete();
  }
}
