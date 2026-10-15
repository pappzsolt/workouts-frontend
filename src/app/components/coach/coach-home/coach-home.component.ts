import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { SHARED_IMPORTS } from '../../shared/shared-imports';
import {
  CoachWorkspaceService,
  addDays,
  toIsoDate,
  workoutStatus,
} from '../../../services/coach/coach-workspace.service';
import type {
  CoachClientOverview,
  CoachClientWorkout,
  CoachWorkoutStatus,
} from '../../../models/coach-workspace.model';
import { STATUS_BADGE, STATUS_LABEL, errorText, initial } from '../coach-ui';

interface TodayRow {
  client: CoachClientOverview;
  workout: CoachClientWorkout;
  status: CoachWorkoutStatus;
}

interface AttentionRow {
  client: CoachClientOverview;
  reasonKey: string;
  params: Record<string, unknown>;
}

interface FinishedRow {
  client: CoachClientOverview;
  programId: number;
  name: string;
  endDate: string;
  done: number;
  total: number;
}

interface ProgramRow {
  programId: number;
  name: string;
  clientCount: number;
}

/** Coach kezdőlap: mai edzések, figyelmet igénylő ügyfelek, aktív programok. */
@Component({
  selector: 'app-coach-home',
  standalone: true,
  imports: [...SHARED_IMPORTS],
  templateUrl: './coach-home.component.html',
})
export class CoachHomeComponent implements OnInit {
  private readonly workspace = inject(CoachWorkspaceService);
  private readonly destroyRef = inject(DestroyRef);

  readonly statusLabel = STATUS_LABEL;
  readonly statusBadge = STATUS_BADGE;
  readonly initial = initial;

  readonly today = toIsoDate(new Date());
  loading = true;
  errorMessage = '';

  todayRows: TodayRow[] = [];
  attention: AttentionRow[] = [];
  programs: ProgramRow[] = [];
  recentlyFinished: FinishedRow[] = [];
  clientCount = 0;
  doneToday = 0;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.errorMessage = '';
    const now = new Date();
    const from = toIsoDate(addDays(now, -7));
    const to = toIsoDate(addDays(now, 7));

    this.workspace
      .getOverview(from, to)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (overview) => {
          this.build(overview.clients);
          this.loading = false;
        },
        error: (error) => {
          this.errorMessage = errorText(error, 'coachWorkspace.loadError');
          this.loading = false;
        },
      });
  }

  private build(clients: CoachClientOverview[]): void {
    this.clientCount = clients.length;

    this.todayRows = clients
      .flatMap((client) =>
        client.workouts
          .filter((workout) => workout.scheduledAt === this.today)
          .map((workout) => ({ client, workout, status: workoutStatus(workout, this.today) })),
      )
      .sort((a, b) => a.client.username.localeCompare(b.client.username));
    this.doneToday = this.todayRows.filter((row) => row.status === 'done').length;

    const weekAgo = toIsoDate(addDays(new Date(), -7));
    this.attention = [];
    for (const client of clients) {
      if (client.programs.length === 0) {
        this.attention.push({ client, reasonKey: 'coachWorkspace.attention.noProgram', params: {} });
        continue;
      }
      const running = client.programs.some((program) => !program.endDate || program.endDate >= this.today);
      if (!running) {
        const lastEnd = client.programs.map((program) => program.endDate ?? '').sort().at(-1) ?? '';
        this.attention.push({ client, reasonKey: 'coachWorkspace.attention.programEnded', params: { date: lastEnd } });
        continue;
      }
      const missed = client.workouts.filter(
        (workout) => workoutStatus(workout, this.today) === 'missed',
      ).length;
      if (missed > 0) {
        this.attention.push({
          client,
          reasonKey: 'coachWorkspace.attention.missed',
          params: { count: missed },
        });
        continue;
      }
      const last = client.lastCompletedAt ? client.lastCompletedAt.substring(0, 10) : null;
      const hadPastWorkout = client.workouts.some((workout) => workout.scheduledAt < this.today);
      if (hadPastWorkout && (last === null || last < weekAgo)) {
        this.attention.push({
          client,
          reasonKey: 'coachWorkspace.attention.inactive',
          params: { date: last ?? '—' },
        });
      }
    }

    const byProgram = new Map<number, ProgramRow>();
    for (const client of clients) {
      for (const program of client.programs) {
        if (program.endDate && program.endDate < this.today) continue;
        const row = byProgram.get(program.programId)
          ?? { programId: program.programId, name: program.name, clientCount: 0 };
        row.clientCount += 1;
        byProgram.set(program.programId, row);
      }
    }
    this.programs = [...byProgram.values()].sort((a, b) => a.name.localeCompare(b.name));

    // Az elmúlt 30 napban lezárult programok ügyfelenként, teljesítéssel.
    const monthAgo = toIsoDate(addDays(new Date(), -30));
    this.recentlyFinished = clients
      .flatMap((client) =>
        client.programs
          .filter((program) => !!program.endDate && program.endDate < this.today && program.endDate >= monthAgo)
          .map((program) => ({
            client,
            programId: program.programId,
            name: program.name,
            endDate: program.endDate as string,
            done: program.completedWorkouts,
            total: program.totalWorkouts,
          })),
      )
      .sort((a, b) => b.endDate.localeCompare(a.endDate));
  }
}
