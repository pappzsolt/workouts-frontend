import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';

import { HttpErrorResponse } from '@angular/common/http';
import { ApiResponse } from '../../../../models/backend-dto/common/api-response';
import { ActivatedRoute, Router } from '@angular/router';

import { Subject, catchError, concatMap, from, of, takeUntil, toArray } from 'rxjs';

import { CoachWorkoutBoardComponent } from '../../../shared/coach/coach-workouts-board/coach-workout-board.component';
import { CoachExercisesBoardComponent } from '../../../shared/coach/coach-exercises-board/coach-exercises-board.component';

import { MessageComponent } from '../../../shared/components/message/message.component';
import { AppCardComponent } from '../../../shared/components/app-card/app-card.component';
import { Workout } from '../../../../models/workout.model';
import { Exercise } from '../../../../models/exercise.model';

import { WorkoutExerciseService } from '../../../../services/coach/workout-exercises.service';
import { LanguageService } from '../../../../services/shared/language.service';

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

  workouts: Workout[] = [];

  exercises: Exercise[] = [];

  selectedWorkoutIds: number[] = [];

  selectedExercises: Exercise[] = [];

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

  // =============================
  // OUTPUT
  // =============================

  @Output()
  assignedWorkouts = new EventEmitter<number[]>();

  @Output()
  assignedExercises = new EventEmitter<Exercise[]>();

  constructor(
    private workoutExerciseService: WorkoutExerciseService,
    private route: ActivatedRoute,
    private router: Router,
    private languageService: LanguageService,
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

  // =============================
  // INIT
  // =============================

  ngOnInit(): void {
    if (this.fromProgramBuilder && this.newWorkoutId !== null) {
      this.selectedWorkoutIds = [this.newWorkoutId];
      this.assignedWorkouts.emit([...this.selectedWorkoutIds]);
    }

    // A workout/exercise boardok maguk kezelik a nyelvváltás miatti újratöltést.
    // Itt nincs szükség külön üres subscriptionre.
  }

  // =============================
  // WORKOUT KIVÁLASZTÁS
  // =============================

  onWorkoutsChange(updatedIds: number[]): void {
    const previousSelectedWorkouts = [...this.selectedWorkoutIds];

    this.selectedWorkoutIds = [...updatedIds];

    this.clearMessage();

    if (JSON.stringify(previousSelectedWorkouts) !== JSON.stringify(this.selectedWorkoutIds)) {
      this.selectedExercises = [];

      this.assignedExercises.emit(this.selectedExercises);
    }

    this.assignedWorkouts.emit(this.selectedWorkoutIds);
  }

  // =============================
  // EXERCISE KIVÁLASZTÁS
  // =============================

  onExercisesChange(updatedExercises: Exercise[]): void {
    this.selectedExercises = [...updatedExercises];

    this.clearMessage();

    this.assignedExercises.emit(this.selectedExercises);
  }

  // =============================
  // WORKOUT ELTÁVOLÍTÁS
  // =============================

  removeWorkout(wid: number): void {
    this.selectedWorkoutIds = this.selectedWorkoutIds.filter((id) => id !== wid);

    this.onWorkoutsChange(this.selectedWorkoutIds);
  }

  // =============================
  // EXERCISE ELTÁVOLÍTÁS
  // =============================

  removeExercise(eid: number): void {
    this.selectedExercises = this.selectedExercises.filter((exercise) => exercise.id !== eid);

    this.onExercisesChange(this.selectedExercises);
  }

  // =============================
  // MENTÉS
  // =============================

  saveSelectedWorkoutsAndExercises(): void {
    this.clearMessage();

    if (this.selectedWorkoutIds.length === 0) {
      this.showError('Válassz ki legalább egy workoutot.');

      return;
    }

    if (this.selectedExercises.length === 0) {
      this.showError('Válassz ki legalább egy exercise-t.');

      return;
    }

    const requests: Array<{
      workoutId: number;
      exerciseId: number;
    }> = [];

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
      this.showError('Nincs menthető exercise.');

      return;
    }

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
                    `Hiba történt az exercise hozzárendelése közben. HTTP ${err.status}`,
                } satisfies ApiResponse<void>),
              ),
            ),
        ),
        toArray(),
        takeUntil(this.destroy$),
      )
      .subscribe((results: ApiResponse<void>[]) => {
        const successes = results
          .filter((result) => result.success)
          .map((result) => result.message || 'Exercise sikeresen hozzárendelve a workouthoz.');

        const errors = results
          .filter((result) => !result.success)
          .map((result) => result.message || 'Hiba történt az exercise hozzárendelése közben.');

        this.finishSave(successes.length, errors.length, [...new Set(successes)], [...new Set(errors)]);
      });
  }

  // =============================
  // MENTÉS EREDMÉNYE
  // =============================

  private finishSave(
    successCount: number,
    errorCount: number,
    successes: string[],
    errors: string[],
  ): void {
    if (errorCount === 0) {
      // ==================================================
      // PROGRAM BUILDERBE VISSZANAVIGÁLÁS
      // ==================================================

      if (this.fromProgramBuilder && this.programId !== null && this.newWorkoutId !== null) {
        this.router.navigate(['/coach/program-builder'], {
          queryParams: {
            programId: this.programId,
            newWorkoutId: this.newWorkoutId,
          },
        });

        return;
      }

      // ==================================================
      // EREDETI SIKERES MENTÉS
      // ==================================================

      this.showSuccess(successes[0] || 'Az exercise-ek sikeresen hozzárendelésre kerültek.');

      return;
    }

    if (successCount === 0) {
      this.showError(errors.join(' '));

      return;
    }

    this.showError(
      [`Sikeres mentések: ${successCount}.`, `Hibás mentések: ${errorCount}.`, ...errors].join(' '),
    );
  }

  // =============================
  // MESSAGE SEGÉDMETÓDUSOK
  // =============================

  private showSuccess(message: string): void {
    this.message = message;

    this.messageType = 'success';
  }

  private showError(message: string): void {
    this.message = message;

    this.messageType = 'error';
  }

  private clearMessage(): void {
    this.message = '';

    this.messageType = '';
  }

  // =============================
  // DESTROY
  // =============================

  ngOnDestroy(): void {
    this.destroy$.next();

    this.destroy$.complete();
  }
  trackByWorkoutId(_index: number, workoutId: number): number {
    return workoutId;
  }

}
