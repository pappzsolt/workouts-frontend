import {
  Component,
  DestroyRef,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  inject,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { ApiResponse } from '../../../../models/backend-dto/common/api-response';
import { ActivatedRoute } from '@angular/router';
import {
  catchError,
  concatMap,
  from,
  of,
  skip,
  toArray,
} from 'rxjs';

import { SHARED_IMPORTS } from '../../../shared/shared-imports';
import { CoachExercisesBoardComponent } from '../../../shared/coach/coach-exercises-board/coach-exercises-board.component';
import { CoachWorkoutBoardComponent } from '../../../shared/coach/coach-workouts-board/coach-workout-board.component';
import { UserSelectComponent } from '../../../shared/user/user-select.component';

import {
  Exercise,
  WorkoutWithExercises,
  WorkoutExercise,
} from '../../../../models/exercise.model';
import type { ProgramWorkoutAssignment } from '../../../../models/program-workout-assignment.model';
import { LanguageService } from '../../../../services/shared/language.service';
import { CoachProgramBuilderWorkoutService } from '../../../../services/coach/coach-program-builder-workout.service';
import type { WorkoutCopyRequest } from '../../../../models/backend-dto/workout/workout-copy-request';
import { WorkoutCopyDialogComponent } from './workout-copy-dialog.component';

@Component({
  selector: 'app-coach-program-builder-workouts',
  standalone: true,
  imports: [
    ...SHARED_IMPORTS,
    CoachExercisesBoardComponent,
    CoachWorkoutBoardComponent,
    UserSelectComponent,
    WorkoutCopyDialogComponent,
  ],
  templateUrl: './coach-program-builder-workouts.component.html',
})
export class CoachProgramBuilderWorkoutsComponent implements OnInit, OnChanges {
  private readonly destroyRef = inject(DestroyRef);

  @Input() selectedUserId: number | undefined;
  @Input() isEditMode = false;
  @Input() programId: number | null = null;
  @Input() currentStep = 2;

  @Output() readonly previousStep = new EventEmitter<void>();
  @Output() readonly finishProgram = new EventEmitter<void>();
  @Output() readonly selectedUserIdChange = new EventEmitter<number | undefined>();
  @Output() readonly goToCreateWorkout = new EventEmitter<void>();

  workouts: WorkoutWithExercises[] = [];
  exercises: Exercise[] = [];
  selectedExercises: Exercise[] = [];
  selectedWorkoutExercises: WorkoutExercise[] = [];

  selectedWorkoutId: number | null = null;
  selectedWorkout: WorkoutWithExercises | null = null;

  selectedWorkouts: WorkoutWithExercises[] = [];
  programWorkouts: ProgramWorkoutAssignment[] = [];

  /**
   * Meglévő workout hozzáadásakor a shared CoachWorkoutBoard
   * által kijelölt, még hozzá nem adott workoutok.
   */
  pendingWorkoutIds: number[] = [];
  showWorkoutPicker = false;

  /**
   * A workout exercise-listája külön modalban jelenik meg.
   * Így a Program Builder fő oldala nem növekszik meg
   * minden exercise kártyájával.
   */
  exerciseDialogOpen = false;
  exerciseDialogWorkout: WorkoutWithExercises | null = null;
  exerciseDialogExercises: Exercise[] = [];
  exerciseDialogIsNewWorkout = false;
  exerciseAddDialogOpen = false;
  exerciseAddDialogExercises: Exercise[] = [];

  copyDialogOpen = false;
  copySourceWorkout: WorkoutWithExercises | null = null;
  copyWorkoutName = '';
  copyWorkoutDate = '';
  copyWorkoutDayIndex = 1;
  copyInProgress = false;

  loadingWorkouts = false;
  loadingExercises = false;
  isNewWorkout = false;

  message = '';
  messageType: 'success' | 'error' | 'info' = 'info';

  private initialized = false;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly languageService: LanguageService,
    private readonly workoutBuilderService: CoachProgramBuilderWorkoutService,
  ) {}

  ngOnInit(): void {
    this.loadWorkouts();
    this.loadExercises();

    this.languageService.language$
      .pipe(skip(1), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.loadWorkouts();
        this.loadExercises();
      });

    this.initialized = true;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (
      this.initialized &&
      changes['programId'] &&
      this.programId !== null &&
      changes['programId'].currentValue !== changes['programId'].previousValue
    ) {
      this.loadProgramWorkouts();
    }
  }

  get lockSelectedExercises(): boolean {
    return !this.exerciseDialogIsNewWorkout;
  }

  get selectedWorkoutIds(): number[] {
    return this.selectedWorkouts
      .map((workout) => workout.id)
      .filter((id): id is number => Number.isInteger(id));
  }

  get selectedExerciseCount(): number {
    return this.exerciseDialogExercises.length;
  }

  loadWorkouts(): void {
    this.loadingWorkouts = true;

    this.workoutBuilderService.loadWorkouts().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        this.workouts = response.data ?? [];
        this.loadingWorkouts = false;

        if (this.programId !== null) {
          this.loadProgramWorkouts();
        }
      },
      error: () => {
        this.workouts = [];
        this.loadingWorkouts = false;
        this.message = 'coachProgramBuilder.loadWorkoutsError';
        this.messageType = 'error';
      },
    });
  }

  loadExercises(): void {
    this.loadingExercises = true;

    this.workoutBuilderService.loadExercises().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        this.exercises = response.data ?? [];
        this.loadingExercises = false;
      },
      error: () => {
        this.exercises = [];
        this.loadingExercises = false;
        this.message = 'coachProgramBuilder.loadExercisesError';
        this.messageType = 'error';
      },
    });
  }

  loadProgramWorkouts(): void {
    if (this.programId === null) {
      return;
    }

    this.workoutBuilderService.loadProgramWorkouts(this.programId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ programWorkouts, allWorkouts }) => {
        this.programWorkouts = programWorkouts;

        this.selectedWorkouts = this.programWorkouts
          .map((programWorkout) =>
            allWorkouts.find((workout) => workout.id === programWorkout.workoutId),
          )
          .filter(
            (workout): workout is WorkoutWithExercises => workout !== undefined,
          );

        const newWorkoutId = this.route.snapshot.queryParamMap.get('newWorkoutId');

        if (newWorkoutId) {
          const workoutId = Number(newWorkoutId);

          if (Number.isInteger(workoutId) && workoutId > 0) {
            const newWorkout = allWorkouts.find((workout) => workout.id === workoutId);

            if (newWorkout) {
              this.isNewWorkout = true;
              this.selectWorkout(newWorkout.id);
              return;
            }
          }

          this.message = 'coachProgramBuilder.newWorkoutNotFound';
          this.messageType = 'error';
        }
      },
      error: () => {
        this.programWorkouts = [];
        this.selectedWorkouts = [];
        this.message = 'coachProgramBuilder.loadProgramWorkoutsError';
        this.messageType = 'error';
      },
    });
  }

  /**
   * A Program Builder fő nézete csak workout szintű információt mutat.
   * Az exercise-ok külön megtekintési/szerkesztési ablakban jelennek meg.
   */
  selectWorkout(workoutId: number): void {
    if (!workoutId) {
      return;
    }

    const workout = this.workouts.find((item) => item.id === workoutId);

    if (!workout) {
      return;
    }

    this.selectedWorkoutId = workoutId;
    this.selectedWorkout = workout;
    this.loadingExercises = true;

    const newWorkoutId = this.route.snapshot.queryParamMap.get('newWorkoutId');
    this.isNewWorkout =
      newWorkoutId !== null && Number(newWorkoutId) === workoutId;

    this.workoutBuilderService.getWorkoutExercises(workoutId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (loadedWorkout) => {
        this.selectedWorkout = loadedWorkout;
        this.selectedWorkoutExercises = loadedWorkout.exercises ?? [];
        this.selectedExercises = this.selectedWorkoutExercises
          .map((workoutExercise) => workoutExercise.exercise)
          .filter((exercise): exercise is Exercise => exercise != null);
        this.loadingExercises = false;

        this.openExerciseDialog();
      },
      error: () => {
        this.selectedWorkoutExercises = [];
        this.selectedExercises = [];
        this.loadingExercises = false;
        this.message = 'coachProgramBuilder.loadWorkoutExercisesError';
        this.messageType = 'error';
      },
    });
  }

  /**
   * A shared exercise board visszaadja a kijelölést.
   * Meglévő workoutnál locked, új workoutnál módosítható.
   */
  onExercisesChange(updatedExercises: Exercise[]): void {
    if (!this.exerciseDialogIsNewWorkout) {
      return;
    }

    this.exerciseDialogExercises = [...updatedExercises];
    this.selectedExercises = [...updatedExercises];
  }

  openExerciseDialog(): void {
    if (!this.selectedWorkout) {
      return;
    }

    this.exerciseDialogWorkout = this.selectedWorkout;
    this.exerciseDialogExercises = [...this.selectedExercises];
    this.exerciseDialogIsNewWorkout = this.isNewWorkout;
    this.exerciseDialogOpen = true;
  }

  closeExerciseDialog(): void {
    this.exerciseAddDialogOpen = false;
    this.exerciseAddDialogExercises = [];
    this.exerciseDialogOpen = false;
    this.exerciseDialogWorkout = null;
    this.exerciseDialogExercises = [];
    this.exerciseDialogIsNewWorkout = false;
  }

  openExerciseAddDialog(): void {
    this.exerciseAddDialogExercises = [...this.exerciseDialogExercises];
    this.exerciseAddDialogOpen = true;
  }

  closeExerciseAddDialog(): void {
    this.exerciseAddDialogOpen = false;
    this.exerciseAddDialogExercises = [];
  }

  onExerciseAddDialogChange(updatedExercises: Exercise[]): void {
    this.exerciseAddDialogExercises = [...updatedExercises];
  }

  confirmExerciseAddDialog(): void {
    const selectedIds = new Set(
      this.exerciseAddDialogExercises.map((exercise) => exercise.id),
    );

    const addedExercises = this.exerciseAddDialogExercises.filter(
      (exercise) =>
        !this.exerciseDialogExercises.some(
          (selected) => selected.id === exercise.id,
        ),
    );

    const removedExercises = this.exerciseDialogExercises.filter(
      (exercise) => !selectedIds.has(exercise.id),
    );

    // Keep the existing business rule: an existing workout is read-only.
    if (!this.exerciseDialogIsNewWorkout) {
      this.closeExerciseAddDialog();
      return;
    }

    this.exerciseDialogExercises = [
      ...this.exerciseDialogExercises.filter(
        (exercise) => !removedExercises.some((removed) => removed.id === exercise.id),
      ),
      ...addedExercises,
    ];

    this.selectedExercises = [...this.exerciseDialogExercises];
    this.closeExerciseAddDialog();
  }

  saveExerciseDialog(): void {
    if (!this.exerciseDialogWorkout || !this.exerciseDialogIsNewWorkout) {
      this.closeExerciseDialog();
      return;
    }

    const workoutId = this.exerciseDialogWorkout.id;

    const existingExerciseIds = new Set(
      this.selectedWorkoutExercises
        .map((workoutExercise) => workoutExercise.exercise?.id)
        .filter((id): id is number => id != null),
    );

    this.loadingExercises = true;

    this.workoutBuilderService
      .saveExercises(workoutId, this.exerciseDialogExercises, existingExerciseIds)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ results, workout }) => {
          const failed = results.filter((result) => !result.success);

          this.loadingExercises = false;

          if (failed.length > 0) {
            this.message = failed
              .map(
                (result) =>
                  result.message || 'coachProgramBuilder.saveExerciseError',
              )
              .join(' ');
            this.messageType = 'error';
            return;
          }

          this.selectedWorkout = workout;
          this.selectedWorkoutExercises = workout.exercises ?? [];
          this.selectedExercises = this.selectedWorkoutExercises
            .map((workoutExercise) => workoutExercise.exercise)
            .filter((exercise): exercise is Exercise => exercise != null);

          this.exerciseDialogExercises = [...this.selectedExercises];
          this.closeExerciseDialog();
        },
        error: () => {
          this.loadingExercises = false;
          this.message = 'coachProgramBuilder.saveExerciseError';
          this.messageType = 'error';
        },
      });
  }

  /**
   * Meglévő workout kiválasztása a shared boardból.
   * A kijelölés még nem ment azonnal; a coach a "Hozzáadás"
   * gombbal erősíti meg.
   */
  onWorkoutPickerChange(ids: number[]): void {
    this.pendingWorkoutIds = [...ids];
  }

  addPendingWorkouts(): void {
    if (this.programId === null) {
      this.message = 'coachProgramBuilder.addWorkoutError';
      this.messageType = 'error';
      return;
    }

    const newIds = this.pendingWorkoutIds.filter(
      (id) => !this.selectedWorkoutIds.includes(id),
    );

    if (!newIds.length) {
      this.message = 'coachProgramBuilder.addedToProgram';
      this.messageType = 'info';
      return;
    }

    const requests = newIds
      .map((workoutId) => this.workouts.find((workout) => workout.id === workoutId))
      .filter((workout): workout is WorkoutWithExercises => workout !== undefined);

    if (!requests.length) {
      return;
    }

    const startDayIndex = this.selectedWorkouts.length + 1;

    from(requests)
      .pipe(
        concatMap((workout, index) =>
          this.workoutBuilderService
            .addWorkout(this.programId!, workout.id, startDayIndex + index)
            .pipe(
              catchError((error: HttpErrorResponse) =>
                of({
                  success: false,
                  data: null,
                  message:
                    error?.error?.message ||
                    'coachProgramBuilder.addWorkoutError',
                } satisfies ApiResponse<ProgramWorkoutAssignment>),
              ),
            ),
        ),
        toArray(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((results) => {
        const failed = results.filter((result) => !result.success);

        if (failed.length) {
          this.message = failed
            .map(
              (result) =>
                result.message || 'coachProgramBuilder.addWorkoutError',
            )
            .join(' ');
          this.messageType = 'error';
          this.loadProgramWorkouts();
          return;
        }

        this.showWorkoutPicker = false;
        this.pendingWorkoutIds = [];
        this.message = 'coachProgramBuilder.addedToProgram';
        this.messageType = 'success';
        this.loadProgramWorkouts();
      });
  }

  isWorkoutSelected(workoutId: number): boolean {
    return this.selectedWorkoutIds.includes(workoutId);
  }

  removeWorkout(workoutId: number): void {
    if (this.programId === null) {
      this.message = 'coachProgramBuilder.removeWorkoutError';
      this.messageType = 'error';
      return;
    }

    this.workoutBuilderService
      .removeWorkout(this.programId, workoutId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          if (!response.success) {
            this.message =
              response.message || 'coachProgramBuilder.removeWorkoutError';
            this.messageType = 'error';
            return;
          }

          this.selectedWorkouts = this.selectedWorkouts.filter(
            (workout) => workout.id !== workoutId,
          );
          this.programWorkouts = this.programWorkouts.filter(
            (programWorkout) => programWorkout.workoutId !== workoutId,
          );

          this.reindexProgramWorkouts();
        },
        error: (error) => {
          this.message =
            error?.error?.message ||
            'coachProgramBuilder.removeWorkoutError';
          this.messageType = 'error';
        },
      });
  }

  reindexProgramWorkouts(): void {
    if (this.programId === null) {
      return;
    }

    this.workoutBuilderService.reindexWorkouts(this.programWorkouts).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (results) => {
        const failed = results.find((result) => !result.success);

        if (failed) {
          this.message =
            failed.message ||
            'coachProgramBuilder.updateWorkoutDayError';
          this.messageType = 'error';
          this.loadProgramWorkouts();
          return;
        }

        this.programWorkouts = results
          .map(
            (result, index) =>
              result.data ?? {
                ...this.programWorkouts[index],
                dayIndex: index + 1,
              },
          )
          .sort((a, b) => a.dayIndex - b.dayIndex);

        this.selectedWorkouts = this.programWorkouts
          .map((pw) => this.workouts.find((workout) => workout.id === pw.workoutId))
          .filter(
            (workout): workout is WorkoutWithExercises => workout !== undefined,
          );
      },
    });
  }

  updateWorkoutDay(workoutId: number, dayIndex: number): void {
    const programWorkout = this.programWorkouts.find(
      (pw) => pw.workoutId === workoutId,
    );

    if (!programWorkout?.id) {
      this.message = 'coachProgramBuilder.updateWorkoutDayError';
      this.messageType = 'error';
      return;
    }

    this.workoutBuilderService
      .updateWorkoutDay(programWorkout.id, dayIndex)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          if (!response.success || !response.data) {
            this.message =
              response.message ||
              'coachProgramBuilder.updateWorkoutDayError';
            this.messageType = 'error';
            return;
          }

          programWorkout.dayIndex = response.data.dayIndex;
          this.programWorkouts = [...this.programWorkouts].sort(
            (a, b) => a.dayIndex - b.dayIndex,
          );

          this.selectedWorkouts = this.programWorkouts
            .map((pw) =>
              this.workouts.find((workout) => workout.id === pw.workoutId),
            )
            .filter(
              (workout): workout is WorkoutWithExercises => workout !== undefined,
            );
        },
        error: (error) => {
          this.message =
            error?.error?.message ||
            'coachProgramBuilder.updateWorkoutDayError';
          this.messageType = 'error';
        },
      });
  }

  getWorkoutDayIndex(workoutId: number): number {
    return (
      this.programWorkouts.find((pw) => pw.workoutId === workoutId)?.dayIndex ??
      1
    );
  }

  openCopyWorkout(workout: WorkoutWithExercises): void {
    if (this.programId === null) {
      this.message = 'coachProgramBuilder.copyError';
      this.messageType = 'error';
      return;
    }

    this.copySourceWorkout = workout;
    this.copyWorkoutName = `${workout.name} - másolat`;
    this.copyWorkoutDate = workout.workoutDate ?? '';
    this.copyWorkoutDayIndex = this.selectedWorkouts.length + 1;
    this.copyDialogOpen = true;
  }

  cancelCopyWorkout(): void {
    this.copyDialogOpen = false;
    this.copySourceWorkout = null;
    this.copyWorkoutName = '';
    this.copyWorkoutDate = '';
    this.copyWorkoutDayIndex = 1;
    this.copyInProgress = false;
  }

  confirmCopyWorkout(): void {
    if (this.programId === null || this.copySourceWorkout === null) {
      this.message = 'coachProgramBuilder.copyError';
      this.messageType = 'error';
      return;
    }

    if (!this.copyWorkoutName.trim()) {
      this.message = 'coachProgramBuilder.copyNameRequired';
      this.messageType = 'error';
      return;
    }

    if (!this.copyWorkoutDate) {
      this.message = 'coachProgramBuilder.copyDateRequired';
      this.messageType = 'error';
      return;
    }

    if (
      !Number.isInteger(this.copyWorkoutDayIndex) ||
      this.copyWorkoutDayIndex < 1
    ) {
      this.message = 'coachProgramBuilder.invalidWorkoutDay';
      this.messageType = 'error';
      return;
    }

    const request: WorkoutCopyRequest = {
      sourceWorkoutId: this.copySourceWorkout.id,
      programId: this.programId,
      workoutName: this.copyWorkoutName.trim(),
      workoutDate: this.copyWorkoutDate,
      dayIndex: this.copyWorkoutDayIndex,
    };

    this.copyInProgress = true;

    this.workoutBuilderService.copyWorkout(request).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        this.copyInProgress = false;

        if (response.success && response.data !== null) {
          this.cancelCopyWorkout();
          this.message = 'coachProgramBuilder.copySuccess';
          this.messageType = 'success';
          this.loadWorkouts();
          return;
        }

        this.message =
          response.message || 'coachProgramBuilder.copyError';
        this.messageType = 'error';
      },
      error: (error: HttpErrorResponse) => {
        this.copyInProgress = false;
        this.message =
          error.error?.message || 'coachProgramBuilder.copyError';
        this.messageType = 'error';
      },
    });
  }

  trackByWorkoutId(
    _index: number,
    workout: WorkoutWithExercises,
  ): number {
    return workout.id;
  }
}
