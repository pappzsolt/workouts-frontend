import { Component, DestroyRef, OnInit, OnChanges, SimpleChanges, Input, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { CoachWorkspaceService } from '../../../services/coach/coach-workspace.service';
import type { CoachClientOverview, CoachClientWorkout } from '../../../models/coach-workspace.model';
import { buildCalendarMonth } from '../../../shared/calendar-month';
import { fromIsoDate, toIsoDate } from '../../../shared/local-date';
import { WEEKDAY_KEYS } from '../coach-ui';
import { AppIconComponent } from '../../shared/components/app-icon/app-icon.component';
import { AppStatusBadgeComponent } from '../../shared/components/app-status-badge/app-status-badge.component';
import { workoutStatus } from '../../../services/coach/coach-workspace.service';

interface CalendarEntry { client: CoachClientOverview; workouts: CoachClientWorkout[]; }

@Component({
  selector: 'app-coach-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslatePipe, AppIconComponent, AppStatusBadgeComponent],
  templateUrl: './coach-calendar.component.html',
  styleUrl: './coach-calendar.component.css',
})
export class CoachCalendarComponent implements OnInit, OnChanges {
  @Input() programId: number | null = null;
  @Input() initialDate: string | null = null;
  @Input() embedded = false;
  private readonly workspace = inject(CoachWorkspaceService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cancelled$ = new Subject<void>();
  readonly today = new Date();
  readonly todayKey = toIsoDate(this.today);
  readonly weekdayKeys = WEEKDAY_KEYS;
  readonly monthKeys = ['january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'];
  month = new Date(this.today.getFullYear(), this.today.getMonth(), 1);
  selectedDate = this.todayKey;
  selectedUserId: number | null = null;
  clients: CoachClientOverview[] = [];
  loading = false;
  failed = false;
  private byDate = new Map<string, CalendarEntry[]>();

  ngOnInit(): void {
    this.openInitialMonth();
    this.load();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['programId'] && !changes['programId'].firstChange)
      || (changes['initialDate'] && !changes['initialDate'].firstChange)) {
      this.openInitialMonth();
      this.load();
    }
  }

  private openInitialMonth(): void {
    if (!this.initialDate) return;
    const date = fromIsoDate(this.initialDate);
    this.month = new Date(date.getFullYear(), date.getMonth(), 1);
    this.selectedDate = this.initialDate;
  }

  get days() { return buildCalendarMonth(this.month.getFullYear(), this.month.getMonth(), this.today); }

  changeMonth(direction: -1 | 1): void {
    this.month = new Date(this.month.getFullYear(), this.month.getMonth() + direction, 1);
    this.selectedDate = toIsoDate(this.month);
    this.load();
  }

  goToToday(): void {
    this.month = new Date(this.today.getFullYear(), this.today.getMonth(), 1);
    this.selectedDate = this.todayKey;
    this.load();
  }

  load(): void {
    this.cancelled$.next();
    this.loading = true;
    this.failed = false;
    this.byDate = new Map();
    const days = this.days;
    this.workspace.getOverview(toIsoDate(days[0].date), toIsoDate(days[days.length - 1].date))
      .pipe(takeUntil(this.cancelled$), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: overview => {
          this.clients = overview.clients
            .filter(client => this.programId === null || client.programs.some(program => program.programId === this.programId)
              || client.workouts.some(workout => workout.programId === this.programId))
            .map(client => ({ ...client, workouts: client.workouts.filter(workout => this.programId === null || workout.programId === this.programId) }))
            .sort((a, b) => a.userId - b.userId);
          if (this.selectedUserId !== null && !this.clients.some(client => client.userId === this.selectedUserId)) {
            this.selectedUserId = null;
          }
          const byDate = new Map<string, CalendarEntry[]>();
          for (const client of this.clients) {
            const workoutsByDate = new Map<string, CoachClientWorkout[]>();
            for (const workout of client.workouts) {
              const date = workout.scheduledAt?.slice(0, 10);
              if (!date) continue;
              workoutsByDate.set(date, [...(workoutsByDate.get(date) ?? []), workout]);
            }
            for (const [date, workouts] of workoutsByDate) {
              byDate.set(date, [...(byDate.get(date) ?? []), { client, workouts }]);
            }
          }
          this.byDate = byDate;
          this.loading = false;
        },
        error: () => { this.loading = false; this.failed = true; },
      });
  }

  entriesFor(date: Date | string): CalendarEntry[] {
    const entries = this.byDate.get(typeof date === 'string' ? date : toIsoDate(date)) ?? [];
    return this.selectedUserId === null ? entries : entries.filter(entry => entry.client.userId === this.selectedUserId);
  }

  selectDate(date: Date): void { this.selectedDate = toIsoDate(date); }
  dateKey(date: Date): string { return toIsoDate(date); }
  get selectedEntries(): CalendarEntry[] { return this.entriesFor(this.selectedDate); }
  clientHue(userId: number): number {
    // Stable per client across months, filters and program views; no repeating small palette.
    return (userId * 137.508) % 360;
  }

  workoutNames(entry: CalendarEntry): string {
    return [...new Set(entry.workouts.map(workout => workout.workoutName))].join(' · ');
  }
  status(workout: CoachClientWorkout) { return workoutStatus(workout, this.todayKey); }
}
