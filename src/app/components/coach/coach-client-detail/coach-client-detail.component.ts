import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, concat, forkJoin, map, of, switchMap, toArray } from 'rxjs';

import { SHARED_IMPORTS } from '../../shared/shared-imports';
import {
  CoachWorkspaceService,
  addDays,
  fromIsoDate,
  startOfWeek,
  toIsoDate,
  workoutStatus,
} from '../../../services/coach/coach-workspace.service';
import type {
  ClientExercisePlan,
  CoachClientOverview,
  CoachClientWorkout,
  CoachProgram,
  CoachWorkoutStatus,
} from '../../../models/coach-workspace.model';
import {
  STATUS_BADGE,
  STATUS_LABEL,
  WEEKDAY_KEYS,
  errorText,
  initial,
  percent,
} from '../coach-ui';

interface DayColumn {
  iso: string;
  date: Date;
  weekdayKey: string;
  isToday: boolean;
  workouts: { workout: CoachClientWorkout; status: CoachWorkoutStatus }[];
}

/**
 * Ügyfél oldal: adatok, programok (hozzárendelés / visszavonás), heti naptár
 * és a kiválasztott edzés ügyfélre szabása (sorozat, ismétlés, súly, pihenő).
 */
@Component({
  selector: 'app-coach-client-detail',
  standalone: true,
  imports: [...SHARED_IMPORTS],
  templateUrl: './coach-client-detail.component.html',
})
export class CoachClientDetailComponent implements OnInit {
  private readonly workspace = inject(CoachWorkspaceService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly statusLabel = STATUS_LABEL;
  readonly statusBadge = STATUS_BADGE;
  readonly initial = initial;
  readonly percent = percent;

  readonly todayIso = toIsoDate(new Date());

  userId = 0;
  client: CoachClientOverview | null = null;
  weekStart = startOfWeek(new Date());
  days: DayColumn[] = [];

  loading = true;
  message = '';
  messageType: 'success' | 'error' | 'info' = 'info';

  // Kiválasztott edzés
  selected: CoachClientWorkout | null = null;
  selectedStatus: CoachWorkoutStatus = 'planned';
  plans: ClientExercisePlan[] = [];
  planLoading = false;
  saving = false;
  rescheduleDate = '';

  // Program hozzárendelés
  assignOpen = false;
  assignLoading = false;
  assignablePrograms: CoachProgram[] = [];
  assignProgramId: number | null = null;
  assigning = false;
  assignedProgramName = '';

  // Visszavonás megerősítése
  revokeProgramId: number | null = null;

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const id = Number(params.get('userId'));
      if (!Number.isInteger(id) || id <= 0) {
        void this.router.navigate(['/coach/clients']);
        return;
      }
      this.userId = id;
      const requested = Number(this.route.snapshot.queryParamMap.get('workout'));
      this.loadWeek(Number.isInteger(requested) && requested > 0 ? requested : null);
    });
  }

  // ----------------------------------------------------------
  // Hét betöltése
  // ----------------------------------------------------------

  previousWeek(): void {
    this.weekStart = addDays(this.weekStart, -7);
    this.loadWeek(null);
  }

  nextWeek(): void {
    this.weekStart = addDays(this.weekStart, 7);
    this.loadWeek(null);
  }

  thisWeek(): void {
    this.weekStart = startOfWeek(new Date());
    this.loadWeek(null);
  }

  get weekEnd(): Date {
    return addDays(this.weekStart, 6);
  }

  loadWeek(selectUserWorkoutId: number | null): void {
    this.loading = true;
    const from = toIsoDate(this.weekStart);
    const to = toIsoDate(this.weekEnd);

    this.workspace
      .getOverview(from, to, this.userId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (overview) => {
          this.client = overview.clients[0] ?? null;
          this.buildDays();
          this.loading = false;

          const all = this.days.flatMap((day) => day.workouts.map((entry) => entry.workout));
          const keep = selectUserWorkoutId ?? this.selected?.userWorkoutId ?? null;
          const toSelect =
            all.find((workout) => workout.userWorkoutId === keep) ??
            all.find((workout) => workout.scheduledAt === this.todayIso) ??
            null;
          if (toSelect) {
            this.select(toSelect);
          } else {
            this.selected = null;
            this.plans = [];
          }
        },
        error: (error) => {
          this.loading = false;
          this.showError(error, 'coachWorkspace.loadError');
        },
      });
  }

  private buildDays(): void {
    const workouts = this.client?.workouts ?? [];
    this.days = WEEKDAY_KEYS.map((weekdayKey, index) => {
      const date = addDays(this.weekStart, index);
      const iso = toIsoDate(date);
      return {
        iso,
        date,
        weekdayKey,
        isToday: iso === this.todayIso,
        workouts: workouts
          .filter((workout) => workout.scheduledAt === iso)
          .map((workout) => ({ workout, status: workoutStatus(workout, this.todayIso) })),
      };
    });
  }

  // ----------------------------------------------------------
  // Edzés kiválasztása és személyre szabása
  // ----------------------------------------------------------

  select(workout: CoachClientWorkout): void {
    this.selected = workout;
    this.selectedStatus = workoutStatus(workout, this.todayIso);
    this.rescheduleDate = workout.scheduledAt;
    this.plans = [];
    this.planLoading = true;

    this.workspace
      .getClientWorkoutExercises(workout.userWorkoutId)
      .pipe(
        switchMap((rows) =>
          rows.length === 0
            ? of([] as ClientExercisePlan[])
            : forkJoin(
                [...rows]
                  .sort((a, b) => a.exercise_order - b.exercise_order)
                  .map((row) =>
                    this.workspace.getClientWorkoutSets(row.user_workout_exercise_id).pipe(
                      map((sets): ClientExercisePlan => {
                        const ordered = [...sets].sort((a, b) => a.setNumber - b.setNumber);
                        const first = ordered[0];
                        return {
                          userWorkoutExerciseId: row.user_workout_exercise_id,
                          name: row.exercise_name,
                          templateRestSeconds: row.rest_seconds,
                          sets: ordered,
                          completed: row.completed,
                          setCount: ordered.length,
                          repetitions: first?.targetRepetitions ?? row.repetitions,
                          weightKg: first?.targetWeightKg ?? null,
                          restSeconds: first?.restSeconds ?? row.rest_seconds,
                        };
                      }),
                    ),
                  ),
              ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (plans) => {
          if (this.selected?.userWorkoutId !== workout.userWorkoutId) return;
          this.plans = plans;
          this.planLoading = false;
        },
        error: (error) => {
          this.planLoading = false;
          this.showError(error, 'coachWorkspace.client.planLoadError');
        },
      });
  }

  isSelected(workout: CoachClientWorkout): boolean {
    return this.selected?.userWorkoutId === workout.userWorkoutId;
  }

  /** Csak a még nem teljesített sorozatok módosíthatók. */
  get editable(): boolean {
    return this.selectedStatus !== 'done';
  }

  completedSetCount(plan: ClientExercisePlan): number {
    return plan.sets.filter((set) => set.completed).length;
  }

  savePlans(): void {
    if (!this.selected || this.saving) return;

    const invalid = this.plans.find(
      (plan) =>
        !Number.isInteger(plan.setCount) || plan.setCount < 1 || plan.setCount > 20 ||
        !Number.isInteger(plan.repetitions) || plan.repetitions < 1 ||
        !Number.isInteger(plan.restSeconds) || plan.restSeconds < 0 ||
        (this.weightValue(plan.weightKg) ?? 0) < 0,
    );
    if (invalid) {
      this.showMessage('coachWorkspace.client.invalidValues', 'error');
      return;
    }
    const blocked = this.plans.find((plan) => plan.setCount < this.completedSetCount(plan));
    if (blocked) {
      this.showMessage('coachWorkspace.client.cannotRemoveCompletedSets', 'error');
      return;
    }

    const operations: Observable<unknown>[] = [];
    for (const plan of this.plans) {
      const values = {
        targetRepetitions: plan.repetitions,
        targetWeightKg: this.weightValue(plan.weightKg),
        restSeconds: plan.restSeconds,
      };
      const keep = Math.min(plan.setCount, plan.sets.length);
      plan.sets.slice(0, keep).forEach((set) => {
        if (!set.completed) operations.push(this.workspace.updateClientSet(set.id, values));
      });
      for (let i = plan.sets.length; i < plan.setCount; i++) {
        operations.push(
          this.workspace
            .addClientSet(plan.userWorkoutExerciseId)
            .pipe(switchMap((setId) => this.workspace.updateClientSet(setId, values))),
        );
      }
      // Fölösleges sorozatok törlése a végéről (csak nem teljesítettek).
      plan.sets
        .slice(plan.setCount)
        .reverse()
        .forEach((set) => operations.push(this.workspace.deleteClientSet(set.id)));
    }

    if (operations.length === 0) {
      this.showMessage('coachWorkspace.client.nothingToSave', 'info');
      return;
    }

    this.saving = true;
    concat(...operations)
      .pipe(toArray(), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving = false;
          this.showMessage('coachWorkspace.client.saved', 'success');
          if (this.selected) this.select(this.selected);
        },
        error: (error) => {
          this.saving = false;
          this.showError(error, 'coachWorkspace.client.saveError');
          if (this.selected) this.select(this.selected);
        },
      });
  }

  reschedule(): void {
    if (!this.selected || !this.rescheduleDate || this.rescheduleDate === this.selected.scheduledAt) return;
    const id = this.selected.userWorkoutId;
    const target = this.rescheduleDate;
    this.workspace
      .rescheduleWorkout(id, target)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.showMessage('coachWorkspace.client.rescheduled', 'success');
          this.weekStart = startOfWeek(fromIsoDate(target));
          this.loadWeek(id);
        },
        error: (error) => this.showError(error, 'coachWorkspace.client.rescheduleError'),
      });
  }

  // ----------------------------------------------------------
  // Program hozzárendelése / visszavonása
  // ----------------------------------------------------------

  openAssign(): void {
    this.assignOpen = true;
    this.assignLoading = true;
    this.assignProgramId = null;
    const assigned = new Set((this.client?.programs ?? []).map((program) => program.programId));
    this.workspace
      .getCoachPrograms()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (programs) => {
          this.assignablePrograms = programs.filter((program) => !assigned.has(program.programId));
          this.assignProgramId = this.assignablePrograms[0]?.programId ?? null;
          this.assignLoading = false;
        },
        error: (error) => {
          this.assignLoading = false;
          this.assignOpen = false;
          this.showError(error, 'coachWorkspace.loadError');
        },
      });
  }

  closeAssign(): void {
    if (!this.assigning) this.assignOpen = false;
  }

  get assignChoice(): CoachProgram | null {
    return this.assignablePrograms.find((program) => program.programId === this.assignProgramId) ?? null;
  }

  confirmAssign(): void {
    if (this.assignProgramId === null || this.assigning) return;
    this.assigning = true;
    const programId = this.assignProgramId;
    const program = this.assignChoice;
    this.workspace
      .assignProgram(this.userId, programId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.assigning = false;
          this.assignOpen = false;
          this.message = 'coachWorkspace.client.assigned';
          this.messageType = 'success';
          this.assignedProgramName = program?.programName ?? '';
          if (program?.startDate) this.weekStart = startOfWeek(fromIsoDate(program.startDate));
          this.loadWeek(null);
        },
        error: (error) => {
          this.assigning = false;
          this.showError(error, 'coachWorkspace.client.assignError');
        },
      });
  }

  askRevoke(programId: number): void {
    this.revokeProgramId = programId;
  }

  cancelRevoke(): void {
    this.revokeProgramId = null;
  }

  confirmRevoke(): void {
    if (this.revokeProgramId === null) return;
    const programId = this.revokeProgramId;
    this.workspace
      .revokeProgram(programId, this.userId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.revokeProgramId = null;
          this.showMessage('coachWorkspace.client.revoked', 'success');
          this.selected = null;
          this.loadWeek(null);
        },
        error: (error) => {
          this.revokeProgramId = null;
          this.showError(error, 'coachWorkspace.client.revokeError');
        },
      });
  }

  // ----------------------------------------------------------
  // Segédek
  // ----------------------------------------------------------

  /** Az üresre törölt súlymező null, minden más szám. */
  private weightValue(value: number | string | null): number | null {
    if (value === null || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  genderKey(gender: string | null): string {
    if (gender === 'MALE') return 'common.male';
    if (gender === 'FEMALE') return 'common.female';
    return 'common.genderNotSpecified';
  }

  private showMessage(key: string, type: 'success' | 'error' | 'info'): void {
    this.assignedProgramName = '';
    this.message = key;
    this.messageType = type;
  }

  private showError(error: unknown, fallbackKey: string): void {
    this.showMessage(errorText(error, fallbackKey), 'error');
  }
}
