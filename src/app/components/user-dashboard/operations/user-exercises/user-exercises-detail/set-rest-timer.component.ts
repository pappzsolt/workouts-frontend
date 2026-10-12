import { ChangeDetectorRef, Component, Input, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription, interval, startWith } from 'rxjs';
import { UserExerciseDetailService, WebSetRestTimerStatus } from '../../../../../services/user/user-exercises-detail/user-exercises-detail.service';

/** Display only: the database is the source of truth for timer start and duration. */
@Component({
  selector: 'app-set-rest-timer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section *ngIf="timer?.exists" aria-label="Pihenőidő"
      class="mx-auto my-4 w-full max-w-md rounded-2xl border border-primary-200 bg-primary-50 p-4 text-center shadow-sm sm:p-5"
      role="timer" [attr.aria-live]="remainingSeconds === 0 ? 'polite' : 'off'">
      <div class="text-sm font-semibold uppercase tracking-wide text-primary-700">Pihenőidő</div>
      <div class="my-2 text-5xl font-bold tabular-nums text-content-900 sm:text-6xl">{{ formattedRemaining }}</div>
      <div class="text-sm font-medium text-primary-800">
        {{ remainingSeconds === 0 ? 'Pihenő lejárt – jöhet a következő sorozat' : 'Hátralévő idő' }}
      </div>
      <div class="mt-3 h-2 w-full overflow-hidden rounded-full bg-primary-200" role="progressbar"
        [attr.aria-valuenow]="elapsedSeconds" [attr.aria-valuemin]="0"
        [attr.aria-valuemax]="timer?.restDurationSeconds ?? 0">
        <div class="h-full bg-primary-600 transition-[width] duration-300" [style.width.%]="progressPercent"></div>
      </div>
    </section>
    <p *ngIf="error" role="alert" class="mx-auto my-3 max-w-md text-center text-sm text-danger-700">{{ error }}</p>
  `,
})
export class SetRestTimerComponent implements OnChanges, OnDestroy {
  @Input() setId: number | null = null;
  @Input() revision = 0;

  timer: WebSetRestTimerStatus | null = null;
  remainingSeconds = 0;
  error = '';
  private request?: Subscription;
  private ticker?: Subscription;
  private receivedAt = 0;
  private initialRemaining = 0;

  constructor(private service: UserExerciseDetailService, private cdr: ChangeDetectorRef) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['setId'] && !changes['revision']) return;
    this.request?.unsubscribe();
    this.ticker?.unsubscribe();
    this.timer = null;
    this.remainingSeconds = 0;
    this.error = '';
    if (this.setId == null) return;
    const requestedId = this.setId;
    this.request = this.service.getRestTimer(requestedId).subscribe({
      next: response => {
        if (this.setId !== requestedId) return;
        if (!response.success || !response.data) {
          this.error = response.message || 'A pihenőidő nem tölthető be.';
          this.cdr.markForCheck();
          return;
        }
        const status = response.data;
        this.timer = status.exists ? status : null;
        if (!this.timer) return;
        this.initialRemaining = Math.max(0, status.remainingSeconds);
        this.receivedAt = Date.now();
        this.ticker = interval(250).pipe(startWith(0)).subscribe(() => {
          const elapsed = Math.floor((Date.now() - this.receivedAt) / 1000);
          this.remainingSeconds = Math.max(0, this.initialRemaining - Math.max(0, elapsed));
          if (this.remainingSeconds === 0) this.ticker?.unsubscribe();
          this.cdr.markForCheck();
        });
        this.cdr.markForCheck();
      },
      error: () => {
        if (this.setId === requestedId) {
          this.error = 'A pihenőidő lekérdezése sikertelen.';
          this.cdr.markForCheck();
        }
      },
    });
  }

  get formattedRemaining(): string {
    const minutes = Math.floor(this.remainingSeconds / 60);
    return `${String(minutes).padStart(2, '0')}:${String(this.remainingSeconds % 60).padStart(2, '0')}`;
  }

  get elapsedSeconds(): number {
    return Math.max(0, (this.timer?.restDurationSeconds ?? 0) - this.remainingSeconds);
  }

  get progressPercent(): number {
    const duration = this.timer?.restDurationSeconds ?? 0;
    return duration > 0 ? Math.min(100, (this.elapsedSeconds / duration) * 100) : 0;
  }

  ngOnDestroy(): void {
    this.request?.unsubscribe();
    this.ticker?.unsubscribe();
  }
}
