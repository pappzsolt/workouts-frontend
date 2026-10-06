import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';

import { HttpErrorResponse } from '@angular/common/http';
import { ApiResponse } from '../../../../models/backend-dto/common/api-response';
import { ActivatedRoute, Router } from '@angular/router';

import { Subject, Subscription, catchError, concatMap, from, of, takeUntil, toArray } from 'rxjs';

import { CoachWorkoutBoardComponent } from '../../../shared/coach/coach-workouts-board/coach-workout-board.component';
import { CoachExercisesBoardComponent } from '../../../shared/coach/coach-exercises-board/coach-exercises-board.component';

import { MessageComponent } from '../../../shared/components/message/message.component';
import { AppCardComponent } from '../../../shared/components/app-card/app-card.component';
import { Workout } from '../../../../models/workout.model';
import { Exercise } from '../../../../models/exercise.model';

import { WorkoutExerciseService } from '../../../../services/coach/workout-exercises.service';
import { CoachWorkoutsService } from '../../../../services/coach/coach-workouts/coach-workouts.service';

import { SHARED_IMPORTS } from '../../../shared/shared-imports';

@Component({
  selector: 'app-assign-workouts-exercises',
  standalone: true,
  imports: [
    ...SHARED_IMPORTS,
    CoachWorkoutBoardComponent,
    CoachExercisesBoardComponent,
    MessageComponent,
    AppCardComponent,
  ],
  styleUrl: './assign-workouts-exercises.component.css',
  templateUrl: './assign-workouts-exercises.component.html',
})
export class AssignWorkoutsExercisesComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private summaryRequest?: Subscription;

  workouts: Workout[] = [];
  exercises: Exercise[] = [];

  selectedWorkoutIds: number[] = [];
  selectedExercises: Exercise[] = [];

  selectedWorkout: Workout | null = null;

  exerciseSelectorOpen = false;

  // =============================
  // PROGRAM BUILDER PARAMÉTEREK
  // =============================

  fromProgramBuilder = false;
  programId: number | null = null;
  newWorkoutId: number | null = null;

  // =============================
  // ÜZENET
  // =============================

  message = '';
  messageType: 'success' | 'error' | 'info' | '' = '';
  messageParams: Record<string, unknown> = {};
  saving = false;

  // =============================
  // OUTPUT
  // =============================

  @Output()
  assignedWorkouts = new EventEmitter<number[]>();

  @Output()
  assignedExercises = new EventEmitter<Exercise[]>();

  constructor(
    private readonly workoutExerciseService: WorkoutExerciseService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly coachWorkoutsService: CoachWorkoutsService,
  ) {
    const fromProgramBuilder = this.route.snapshot.queryParamMap.get('fromProgramBuilder');

    const routeProgramId = this.route.snapshot.paramMap.get('id');
    const programId =
      this.route.snapshot.queryParamMap.get('programId') ?? routeProgramId;

    const workoutId = this.route.snapshot.queryParamMap.get('workoutId');

    this.fromProgramBuilder = fromProgramBuilder === 'true';
    this.programId = programId !== null ? Number(programId) : null;
    this.newWorkoutId = workoutId !== null ? Number(workoutId) : null;
  }

  ngOnInit(): void {
    if (this.newWorkoutId !== null) {
      this.selectWorkout(this.newWorkoutId);
    }
  }

  // =============================
  // WORKOUT KIVÁLASZTÁS
  // =============================

  onWorkoutsChange(updatedIds: number[]): void {
    const previousSelectedWorkouts = [...this.selectedWorkoutIds];

    this.selectedWorkoutIds = [...updatedIds];
    this.clearMessage();

    const changed =
      previousSelectedWorkouts.length !== this.selectedWorkoutIds.length ||
      previousSelectedWorkouts.some((id, index) => id !== this.selectedWorkoutIds[index]);

    if (changed) {
      this.selectedExercises = [];
      this.assignedExercises.emit([]);
    }

    if (this.selectedWorkoutIds.length) {
      this.selectWorkout(this.selectedWorkoutIds[0], false);
    } else {
      this.summaryRequest?.unsubscribe();
      this.selectedWorkout = null;
      this.exerciseSelectorOpen = false;
    }

    this.assignedWorkouts.emit(this.selectedWorkoutIds);
  }

  selectWorkout(workoutId: number, openExerciseSelector = false): void {
    if (!Number.isInteger(workoutId) || workoutId <= 0) {
      return;
    }

    this.selectedWorkoutIds = [workoutId];
    this.clearMessage();
    this.selectedWorkout = null;
    this.loadWorkoutSummary(workoutId);

    if (openExerciseSelector) {
      this.exerciseSelectorOpen = true;
    }

    this.assignedWorkouts.emit([...this.selectedWorkoutIds]);
  }

  private loadWorkoutSummary(workoutId: number): void {
    this.summaryRequest?.unsubscribe();
    this.summaryRequest = this.coachWorkoutsService.getWorkoutById(workoutId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (!this.selectedWorkoutIds.includes(workoutId)) return;
          const data = response.data;

          if (!data) {
            this.selectedWorkout = {
              id: workoutId,
              name: `Workout #${workoutId}`,
              workoutName: `Workout #${workoutId}`,
              exercises: [],
            };
            return;
          }

          this.selectedWorkout = {
            id: data.workoutId ?? workoutId,
            name: data.workoutName ?? `Workout #${workoutId}`,
            workoutName: data.workoutName ?? `Workout #${workoutId}`,
            description: data.workoutDescription ?? undefined,
            workoutDescription: data.workoutDescription ?? undefined,
            workoutDate: data.workoutDate ?? undefined,
            durationMinutes: data.durationMinutes ?? undefined,
            intensityLevel: data.intensityLevel ?? undefined,
            exercises: [],
          };
        },
        error: () => {
          if (!this.selectedWorkoutIds.includes(workoutId)) return;
          this.selectedWorkout = {
            id: workoutId,
            name: `Workout #${workoutId}`,
            workoutName: `Workout #${workoutId}`,
            exercises: [],
          };
        },
      });
  }

  changeWorkout(): void {
    this.summaryRequest?.unsubscribe();
    this.exerciseSelectorOpen = false;
    this.selectedWorkout = null;
    this.selectedWorkoutIds = [];
    this.selectedExercises = [];
    this.assignedExercises.emit([]);
    this.assignedWorkouts.emit([]);
  }

  // =============================
  // EXERCISE KIVÁLASZTÁS
  // =============================

  openExerciseSelector(): void {
    if (!this.selectedWorkoutIds.length) {
      this.showError('assignWorkoutExercises.errors.selectWorkout');
      return;
    }

    this.exerciseSelectorOpen = true;
  }

  closeExerciseSelector(): void {
    this.exerciseSelectorOpen = false;
  }

  onExercisesChange(updatedExercises: Exercise[]): void {
    this.selectedExercises = [...updatedExercises];
    this.clearMessage();
    this.assignedExercises.emit(this.selectedExercises);
  }

  removeExercise(eid: number | undefined): void {
    if (eid == null) {
      return;
    }

    this.selectedExercises = this.selectedExercises.filter((exercise) => exercise.id !== eid);
    this.assignedExercises.emit([...this.selectedExercises]);
  }

  // =============================
  // MENTÉS
  // =============================

  saveSelectedWorkoutsAndExercises(): void {
    if (this.saving) {
      return;
    }

    this.clearMessage();

    if (this.selectedWorkoutIds.length === 0) {
      this.showError('assignWorkoutExercises.errors.selectWorkout');
      return;
    }

    if (this.selectedExercises.length === 0) {
      this.showError('assignWorkoutExercises.errors.selectExercise');
      this.exerciseSelectorOpen = true;
      return;
    }

    const requests: Array<{ workoutId: number; exerciseId: number }> = [];

    for (const workoutId of this.selectedWorkoutIds) {
      for (const exercise of this.selectedExercises) {
        if (exercise.id == null) {
          continue;
        }

        requests.push({
          workoutId,
          exerciseId: exercise.id,
        });
      }
    }

    if (requests.length === 0) {
      this.showError('assignWorkoutExercises.errors.noExercise');
      return;
    }

    this.saving = true;

    from(requests)
      .pipe(
        concatMap((request) =>
          this.workoutExerciseService
            .addWorkoutExerciseSimple(request.workoutId, request.exerciseId)
            .pipe(
              catchError((err: HttpErrorResponse) =>
                of({
                  success: false,
                  data: null,
                  message:
                    (typeof err.error === 'string' ? err.error : err.error?.message) ||
                    'assignWorkoutExercises.errors.assign',
                } satisfies ApiResponse<void>),
              ),
            ),
        ),
        toArray(),
        takeUntil(this.destroy$),
      )
      .subscribe((results: ApiResponse<void>[]) => {
        this.saving = false;

        const successes = results
          .filter((result) => result.success)
          .map((result) => result.message || 'assignWorkoutExercises.errors.assignSuccess');

        const errors = results
          .filter((result) => !result.success)
          .map((result) => result.message || 'assignWorkoutExercises.errors.assign');

        this.finishSave(
          successes.length,
          errors.length,
          [...new Set(successes)],
          [...new Set(errors)],
        );
      });
  }

  private finishSave(
    successCount: number,
    errorCount: number,
    successes: string[],
    errors: string[],
  ): void {
    if (errorCount === 0) {
      if (this.fromProgramBuilder && this.programId !== null && this.newWorkoutId !== null) {
        this.router.navigate(['/coach/program-builder'], {
          queryParams: {
            programId: this.programId,
            newWorkoutId: this.newWorkoutId,
          },
        });
        return;
      }

      this.showSuccess(successes[0] || 'assignWorkoutExercises.errors.assignSuccess');
      return;
    }

    if (successCount === 0) {
      this.showError(errors.join(' '));
      return;
    }

    this.showInfo('assignWorkoutExercises.batchSummary', {
      successCount,
      errorCount,
      errors: errors.join(' '),
    });
  }

  // =============================
  // MESSAGE SEGÉDMETÓDUSOK
  // =============================

  private showSuccess(message: string): void {
    this.message = message;
    this.messageParams = {};
    this.messageType = 'success';
  }

  private showError(message: string): void {
    this.message = message;
    this.messageParams = {};
    this.messageType = 'error';
  }

  private showInfo(message: string, params: Record<string, unknown> = {}): void {
    this.message = message;
    this.messageParams = params;
    this.messageType = 'info';
  }

  private clearMessage(): void {
    this.message = '';
    this.messageType = '';
    this.messageParams = {};
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
