import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { SHARED_IMPORTS } from '../../shared/shared-imports';
import {
  CoachWorkspaceService,
  addDays,
  startOfWeek,
  toIsoDate,
  workoutStatus,
} from '../../../services/coach/coach-workspace.service';
import type { CoachClientOverview } from '../../../models/coach-workspace.model';
import { errorText, initial, percent } from '../coach-ui';

interface ClientRow {
  client: CoachClientOverview;
  programNames: string;
  weekDone: number;
  weekTotal: number;
  weekPercent: number;
  missed: number;
  lastCompleted: string | null;
}

/** Ügyfelek listája: ki melyik programon van, hogy áll a héten. */
@Component({
  selector: 'app-coach-clients',
  standalone: true,
  imports: [...SHARED_IMPORTS],
  templateUrl: './coach-clients.component.html',
})
export class CoachClientsComponent implements OnInit {
  private readonly workspace = inject(CoachWorkspaceService);
  private readonly destroyRef = inject(DestroyRef);

  readonly initial = initial;

  loading = true;
  errorMessage = '';
  search = '';
  rows: ClientRow[] = [];

  get filteredRows(): ClientRow[] {
    const term = this.search.trim().toLowerCase();
    if (!term) return this.rows;
    return this.rows.filter(
      (row) =>
        row.client.username.toLowerCase().includes(term) ||
        (row.client.email ?? '').toLowerCase().includes(term) ||
        row.programNames.toLowerCase().includes(term),
    );
  }

  ngOnInit(): void {
    const today = new Date();
    const weekStart = startOfWeek(today);
    const todayIso = toIsoDate(today);

    this.workspace
      .getOverview(toIsoDate(weekStart), toIsoDate(addDays(weekStart, 6)))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (overview) => {
          this.rows = overview.clients.map((client) => {
            const done = client.workouts.filter((w) => w.completed).length;
            const activePrograms = client.programs.filter((p) => !p.endDate || p.endDate >= todayIso);
            return {
              client,
              programNames: activePrograms.map((p) => p.name).join(', '),
              weekDone: done,
              weekTotal: client.workouts.length,
              weekPercent: percent(done, client.workouts.length),
              missed: client.workouts.filter((w) => workoutStatus(w, todayIso) === 'missed').length,
              lastCompleted: client.lastCompletedAt ? client.lastCompletedAt.substring(0, 10) : null,
            };
          });
          this.loading = false;
        },
        error: (error) => {
          this.errorMessage = errorText(error, 'coachWorkspace.loadError');
          this.loading = false;
        },
      });
  }
}
