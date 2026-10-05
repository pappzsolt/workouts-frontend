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
import { ActivatedRoute } from '@angular/router';
import { skip, Subscription } from 'rxjs';

import { SHARED_IMPORTS } from '../../../shared/shared-imports';
import { CoachWorkoutBoardComponent } from '../../../shared/coach/coach-workouts-board/coach-workout-board.component';
import { UserMultiSelectComponent } from '../../../shared/user/user-multi-select.component';

import {
  Exercise,
  WorkoutWithExercises,
  WorkoutExercise,
} from '../../../../models/exercise.model';
import { ProgramWorkoutState, type ProgramWorkoutOccurrence } from '../../../../models/program-workout-state';
import type { ProgramWorkoutAssignment } from '../../../../models/program-workout-assignment.model';
import { LanguageService } from '../../../../services/shared/language.service';
import { CoachProgramBuilderWorkoutService } from '../../../../services/coach/coach-program-builder-workout.service';
import type { WorkoutCopyRequest } from '../../../../models/backend-dto/workout/workout-copy-request';
import { ProgramExerciseDialogComponent } from './program-exercise-dialog.component';
import { WorkoutCopyDialogComponent } from './workout-copy-dialog.component';

@Component({
  selector: 'app-coach-program-builder-workouts',
  standalone: true,
  imports: [
    ...SHARED_IMPORTS,
    ProgramExerciseDialogComponent,
    CoachWorkoutBoardComponent,
    UserMultiSelectComponent,
    WorkoutCopyDialogComponent,
  ],
  templateUrl: './coach-program-builder-workouts.component.html',
})
export class CoachProgramBuilderWorkoutsComponent implements OnInit, OnChanges {
  private readonly destroyRef = inject(DestroyRef);

  @Input() selectedUserIds: number[] = [];
  @Input() assignedUserIds: number[] = [];
  @Input() assignmentBusy = false;
  userSelectionReady = false;
  @Input() isEditMode = false;
  @Input() programId: number | null = null;
  @Input() currentStep = 2;

  @Output() readonly previousStep = new EventEmitter<void>();
  @Output() readonly finishProgram = new EventEmitter<void>();
  @Output() readonly selectedUserIdsChange = new EventEmitter<number[]>();
  @Output() readonly userSelectionReadyChange = new EventEmitter<boolean>();
  @Output() readonly goToCreateWorkout = new EventEmitter<void>();

  workouts: WorkoutWithExercises[] = [];
  exercises: Exercise[] = [];
  selectedExercises: Exercise[] = [];
  selectedWorkoutExercises: WorkoutExercise[] = [];

  selectedWorkoutId: number | null = null;
  selectedProgramWorkoutId: number | null = null;
  selectedWorkout: WorkoutWithExercises | null = null;

  state = new ProgramWorkoutState();
  get selectedWorkouts(): WorkoutWithExercises[] {
    return this.state.occurrences.map((row) => row.workout);
  }
  get programWorkouts(): ProgramWorkoutAssignment[] {
    return this.state.assignments;
  }

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
  exerciseDialogIsNewWorkout = false;

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
  private programLoad?: Subscription;

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
    if (changes['programId']) {
      this.programLoad?.unsubscribe();
      this.state = new ProgramWorkoutState();
      if (this.initialized && this.programId !== null) this.loadProgramWorkouts();
    }
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

    this.programLoad?.unsubscribe();
    this.programLoad = this.workoutBuilderService.loadProgramWorkouts(this.programId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ state, allWorkouts }) => {
        this.state = state;

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
        this.state = new ProgramWorkoutState();
        this.message = 'coachProgramBuilder.loadProgramWorkoutsError';
        this.messageType = 'error';
      },
    });
  }

  /**
   * A Program Builder fő nézete csak workout szintű információt mutat.
   * Az exercise-ok külön megtekintési/szerkesztési ablakban jelennek meg.
   */
  selectWorkout(workoutId: number, programWorkoutId: number | null = null): void {
    if (!workoutId) {
      return;
    }

    const workout = this.workouts.find((item) => item.id === workoutId);

    if (!workout) {
      return;
    }

    this.selectedWorkoutId = workoutId;
    this.selectedProgramWorkoutId = programWorkoutId;
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

        this.exerciseDialogWorkout = loadedWorkout;
        this.exerciseDialogIsNewWorkout = this.isNewWorkout;
        this.exerciseDialogOpen = true;
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
  closeExerciseDialog(): void {
    this.exerciseDialogOpen = false;
    this.exerciseDialogWorkout = null;
    this.selectedProgramWorkoutId = null;
  }

  onWorkoutExercisesSaved(workout: WorkoutWithExercises): void {
    this.selectedWorkout = workout;
    this.selectedWorkoutExercises = workout.exercises ?? [];
    this.selectedExercises = this.selectedWorkoutExercises.map((row) => row.exercise);
  }

  onExerciseSaveError(message: string): void {
    this.message = message;
    this.messageType = 'error';
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

    const newIds = [...this.pendingWorkoutIds];

    if (!newIds.length) {
      this.message = 'coachProgramBuilder.addedToProgram';
      this.messageType = 'info';
      return;
    }

    /*
     * A picker saját, lapozott workout listát használhat, ezért a kijelölt ID-k
     * nem feltétlenül találhatók meg a komponens this.workouts tömbjében.
     * A program-workout API-nak csak a workoutId kell, így közvetlenül az ID-kat
     * küldjük. Ezzel megszűnik az a csendes hiba, amikor requests üres lett és
     * a gomb látszólag nem csinált semmit.
     */
    const workoutIdsToAdd = [...newIds];

    this.workoutBuilderService
      .addWorkouts(this.programId, workoutIdsToAdd, this.state.nextDayIndex)
      .pipe(takeUntilDestroyed(this.destroyRef))
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


  removeWorkout(programWorkoutId: number): void {
    if (this.programId === null || !programWorkoutId) {
      this.message = 'coachProgramBuilder.removeWorkoutError';
      this.messageType = 'error';
      return;
    }

    const occurrenceIndex = this.programWorkouts.findIndex(
      (programWorkout) => programWorkout.id === programWorkoutId,
    );
    const occurrence = this.programWorkouts[occurrenceIndex];

    if (occurrenceIndex < 0 || !occurrence) {
      this.message = 'coachProgramBuilder.removeWorkoutError';
      this.messageType = 'error';
      return;
    }

    this.workoutBuilderService
      .removeWorkout(programWorkoutId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          if (!response.success) {
            this.message =
              response.message || 'coachProgramBuilder.removeWorkoutError';
            this.messageType = 'error';
            return;
          }

          this.state.remove(programWorkoutId);

        },
        error: (error) => {
          this.message =
            error?.error?.message ||
            'coachProgramBuilder.removeWorkoutError';
          this.messageType = 'error';
        },
      });
  }

  updateWorkoutDay(programWorkoutId: number, dayIndex: number): void {
    const programWorkout = this.programWorkouts.find(
      (pw) => pw.id === programWorkoutId,
    );

    if (!programWorkout) {
      this.message = 'coachProgramBuilder.updateWorkoutDayError';
      this.messageType = 'error';
      return;
    }

    this.workoutBuilderService
      .updateWorkoutDay(programWorkoutId, dayIndex)
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

          try {
            this.state.update(response.data);
          } catch {
            this.message = 'coachProgramBuilder.updateWorkoutDayError';
            this.messageType = 'error';
          }

        },
        error: (error) => {
          this.message =
            error?.error?.message ||
            'coachProgramBuilder.updateWorkoutDayError';
          this.messageType = 'error';
        },
      });
  }

  getWorkoutDayIndex(programWorkoutId: number | null): number {
    if (programWorkoutId === null) {
      return 1;
    }

    return (
      this.programWorkouts.find((pw) => pw.id === programWorkoutId)?.dayIndex ??
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
    this.copyWorkoutDayIndex = this.state.nextDayIndex;
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

  readonly trackBySelectedWorkoutOccurrence = (
    _index: number, occurrence: ProgramWorkoutOccurrence,
  ): number => occurrence.assignment.id;
}
