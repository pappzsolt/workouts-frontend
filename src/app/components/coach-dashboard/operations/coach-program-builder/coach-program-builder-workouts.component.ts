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
import { ActivatedRoute } from '@angular/router';
import { skip } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { SHARED_IMPORTS } from '../../../shared/shared-imports';
import { CoachExercisesBoardComponent } from '../../../shared/coach/coach-exercises-board/coach-exercises-board.component';
import { UserSelectComponent } from '../../../shared/user/user-select.component';

import { Exercise, WorkoutWithExercises, WorkoutExercise } from '../../../../models/exercise.model';
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
    this.loadExercises();
    this.loadWorkouts();

    this.languageService.language$
      .pipe(skip(1), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.loadExercises();
        this.loadWorkouts();
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
    return !this.isNewWorkout;
  }

  loadWorkouts(): void {
    this.loadingWorkouts = true;

    this.workoutBuilderService.loadWorkouts().subscribe({
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

    this.workoutBuilderService.loadExercises().subscribe({
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

    this.workoutBuilderService.loadProgramWorkouts(this.programId).subscribe({
      next: ({ programWorkouts, allWorkouts }) => {
        this.programWorkouts = programWorkouts;
        this.selectedWorkouts = this.programWorkouts
          .map((programWorkout) =>
            allWorkouts.find((workout) => workout.id === programWorkout.workoutId),
          )
          .filter((workout): workout is WorkoutWithExercises => workout !== undefined);

        const newWorkoutId = this.route.snapshot.queryParamMap.get('newWorkoutId');

        if (newWorkoutId) {
          const workoutId = Number(newWorkoutId);

          if (Number.isInteger(workoutId) && workoutId > 0) {
            const newWorkout = allWorkouts.find((workout) => workout.id === workoutId);

            if (newWorkout) {
              this.isNewWorkout = true;
              this.selectWorkout(newWorkout.id);
            } else {
              this.message = 'coachProgramBuilder.newWorkoutNotFound';
              this.messageType = 'error';
            }
          }
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

  selectWorkout(workoutId: number): void {
    if (!workoutId) {
      return;
    }

    if (this.selectedWorkoutId === workoutId) {
      this.selectedWorkoutId = null;
      this.selectedWorkout = null;
      this.selectedWorkoutExercises = [];
      this.selectedExercises = [];
      this.loadingExercises = false;
      this.isNewWorkout = false;
      return;
    }

    this.selectedWorkoutId = workoutId;
    this.selectedWorkout = null;
    this.loadingExercises = true;
    this.selectedWorkoutExercises = [];
    this.selectedExercises = [];

    const newWorkoutId = this.route.snapshot.queryParamMap.get('newWorkoutId');
    this.isNewWorkout = newWorkoutId !== null && Number(newWorkoutId) === workoutId;

    this.workoutBuilderService.getWorkoutExercises(workoutId).subscribe({
      next: (workout) => {
        this.selectedWorkout = workout;
        this.selectedWorkoutExercises = workout.exercises || [];
        this.selectedExercises = this.selectedWorkoutExercises
          .map((workoutExercise) => workoutExercise.exercise)
          .filter((exercise): exercise is Exercise => exercise != null);
        this.loadingExercises = false;
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

  onExercisesChange(updatedExercises: Exercise[]): void {
    if (!this.isNewWorkout) {
      return;
    }

    this.selectedExercises = [...updatedExercises];
  }

  saveSelectedExercises(): void {
    const selectedWorkoutId = this.selectedWorkoutId;

    if (selectedWorkoutId === null || !this.isNewWorkout) {
      return;
    }

    const existingExerciseIds = new Set(
      this.selectedWorkoutExercises
        .map((workoutExercise) => workoutExercise.exercise?.id)
        .filter((id): id is number => id != null),
    );

    this.workoutBuilderService
      .saveExercises(selectedWorkoutId, this.selectedExercises, existingExerciseIds)
      .subscribe({
        next: ({ results, workout }) => {
          const failed = results.filter((result) => !result.success);

          if (failed.length > 0) {
            this.message = failed
              .map((result) => result.message || 'coachProgramBuilder.saveExerciseError')
              .join(' ');
            this.messageType = 'error';
            return;
          }

          this.selectedWorkout = workout;
          this.selectedWorkoutExercises = workout.exercises || [];
          this.selectedExercises = this.selectedWorkoutExercises
            .map((workoutExercise) => workoutExercise.exercise)
            .filter((exercise): exercise is Exercise => exercise != null);
        },
        error: () => {
          this.message = 'coachProgramBuilder.loadWorkoutExercisesError';
          this.messageType = 'error';
        },
      });
  }

  isWorkoutSelected(workoutId: number): boolean {
    return this.selectedWorkouts.some((workout) => workout.id === workoutId);
  }

  addSelectedWorkout(): void {
    if (!this.selectedWorkout || this.programId === null) {
      this.message = 'coachProgramBuilder.addWorkoutError';
      this.messageType = 'error';
      return;
    }

    if (this.isWorkoutSelected(this.selectedWorkout.id)) {
      return;
    }

    const workout = this.selectedWorkout;
    const dayIndex = this.selectedWorkouts.length + 1;

    this.workoutBuilderService
      .addWorkout(this.programId, workout.id, dayIndex)
      .subscribe({
        next: (response) => {
          if (!response.success || !response.data) {
            this.message = response.message || 'coachProgramBuilder.addWorkoutError';
            this.messageType = 'error';
            return;
          }

          this.selectedWorkouts.push(workout);
          this.programWorkouts.push(response.data);

          if (this.isNewWorkout) {
            this.saveSelectedExercises();
          }
        },
        error: (error) => {
          this.message = error?.error?.message || 'coachProgramBuilder.addWorkoutError';
          this.messageType = 'error';
        },
      });
  }

  removeWorkout(workoutId: number): void {
    if (this.programId === null) {
      this.message = 'coachProgramBuilder.removeWorkoutError';
      this.messageType = 'error';
      return;
    }

    this.workoutBuilderService.removeWorkout(this.programId, workoutId).subscribe({
      next: (response) => {
        if (!response.success) {
          this.message = response.message || 'coachProgramBuilder.removeWorkoutError';
          this.messageType = 'error';
          return;
        }

        this.selectedWorkouts = this.selectedWorkouts.filter((workout) => workout.id !== workoutId);
        this.programWorkouts = this.programWorkouts.filter(
          (programWorkout) => programWorkout.workoutId !== workoutId,
        );

        if (this.selectedWorkoutId === workoutId) {
          this.selectedWorkoutId = null;
          this.selectedWorkout = null;
          this.selectedWorkoutExercises = [];
          this.selectedExercises = [];
          this.isNewWorkout = false;
        }

        this.reindexProgramWorkouts();
      },
      error: (error) => {
        this.message = error?.error?.message || 'coachProgramBuilder.removeWorkoutError';
        this.messageType = 'error';
      },
    });
  }

  reindexProgramWorkouts(): void {
    if (this.programId === null) {
      return;
    }

    this.workoutBuilderService.reindexWorkouts(this.programWorkouts).subscribe({
      next: (results) => {
        const failed = results.find((result) => !result.success);

        if (failed) {
          this.message = failed.message || 'coachProgramBuilder.updateWorkoutDayError';
          this.messageType = 'error';
          this.loadProgramWorkouts();
          return;
        }

        this.programWorkouts = results
          .map((result, index) => result.data ?? { ...this.programWorkouts[index], dayIndex: index + 1 })
          .sort((a, b) => a.dayIndex - b.dayIndex);
      },
    });
  }

  updateWorkoutDay(workoutId: number, dayIndex: number): void {
    const programWorkout = this.programWorkouts.find((pw) => pw.workoutId === workoutId);

    if (!programWorkout?.id) {
      this.message = 'coachProgramBuilder.updateWorkoutDayError';
      this.messageType = 'error';
      return;
    }

    this.workoutBuilderService.updateWorkoutDay(programWorkout.id, dayIndex).subscribe({
      next: (response) => {
        if (!response.success || !response.data) {
          this.message = response.message || 'coachProgramBuilder.updateWorkoutDayError';
          this.messageType = 'error';
          return;
        }

        programWorkout.dayIndex = response.data.dayIndex;
        this.programWorkouts = [...this.programWorkouts].sort((a, b) => a.dayIndex - b.dayIndex);

        this.selectedWorkouts = this.programWorkouts
          .map((pw) => this.workouts.find((workout) => workout.id === pw.workoutId))
          .filter((workout): workout is WorkoutWithExercises => workout !== undefined);
      },
      error: (error) => {
        this.message = error?.error?.message || 'coachProgramBuilder.updateWorkoutDayError';
        this.messageType = 'error';
      },
    });
  }

  getWorkoutDayIndex(workoutId: number): number {
    return this.programWorkouts.find((pw) => pw.workoutId === workoutId)?.dayIndex ?? 1;
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

    if (!Number.isInteger(this.copyWorkoutDayIndex) || this.copyWorkoutDayIndex < 1) {
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

    this.workoutBuilderService.copyWorkout(request).subscribe({
      next: (response) => {
        this.copyInProgress = false;

        if (response.success && response.data !== null) {
          this.cancelCopyWorkout();
          this.message = 'coachProgramBuilder.copySuccess';
          this.messageType = 'success';
          this.loadWorkouts();
          return;
        }

        this.message = response.message || 'coachProgramBuilder.copyError';
        this.messageType = 'error';
      },
      error: (error: HttpErrorResponse) => {
        this.copyInProgress = false;
        this.message = error.error?.message || 'coachProgramBuilder.copyError';
        this.messageType = 'error';
      },
    });
  }

  trackByWorkoutId(_index: number, workout: WorkoutWithExercises): number {
    return workout.id;
  }

  trackByExerciseId(_index: number, exercise: Exercise): number {
    return exercise.id ?? _index;
  }
}
