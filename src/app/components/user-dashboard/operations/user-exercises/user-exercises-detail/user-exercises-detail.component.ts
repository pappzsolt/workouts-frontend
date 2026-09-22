import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { Subject, takeUntil } from 'rxjs';

import { UserExerciseDetailService } from '../../../../../services/user/user-exercises-detail/user-exercises-detail.service';
import { SidePaginationComponent } from '../../../../../components/shared/components/side-pagination/side-pagination.component';
import { LanguageService } from '../../../../../services/shared/language.service';

import {
  UserWorkoutDetailDto,
  UserWorkoutExerciseSetDto,
} from '../../../../../models/user-workout-exercise-detail.dto';

import { SHARED_IMPORTS } from '../../../../shared/shared-imports';

@Component({
  selector: 'app-user-exercise-detail',
  standalone: true,
  imports: [...SHARED_IMPORTS, SidePaginationComponent],
  templateUrl: './user-exercises-detail.component.html',
  styleUrls: ['./user-exercises-detail.component.css'],
})
export class UserExerciseDetailComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  workout?: UserWorkoutDetailDto;

  workoutExercise?: UserWorkoutDetailDto['exercises'][number];

  workoutId!: number;
  programId!: number;
  private currentExerciseId!: number;
  currentSetIndex = 0;

  message = '';
  messageType: 'success' | 'error' | 'info' | '' = '';

  constructor(
    private route: ActivatedRoute,
    private exercisesService: UserExerciseDetailService,
    private languageService: LanguageService,
  ) {}

  ngOnInit(): void {
    this.workoutId = Number(this.route.snapshot.paramMap.get('workoutId'));

    const navState = history.state;
    this.programId = Number(navState['programId']);

    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const exerciseId = Number(params.get('exerciseId'));

      if (!exerciseId || Number.isNaN(exerciseId)) {
        return;
      }

      this.currentExerciseId = exerciseId;
      this.currentSetIndex = 0;
      this.loadExerciseDetail(exerciseId);
    });

    this.languageService.language$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      if (this.currentExerciseId) {
        this.loadExerciseDetail(this.currentExerciseId);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get currentSet(): UserWorkoutExerciseSetDto | undefined {
    return this.workoutExercise?.userWorkoutExerciseSets?.[this.currentSetIndex];
  }

  get hasPreviousSet(): boolean {
    return this.currentSetIndex > 0;
  }

  get hasNextSet(): boolean {
    return (
      !!this.workoutExercise?.userWorkoutExerciseSets?.length &&
      this.currentSetIndex < this.workoutExercise.userWorkoutExerciseSets.length - 1
    );
  }

  previousSet(): void {
    if (this.hasPreviousSet) {
      this.currentSetIndex--;
    }
  }

  nextSet(): void {
    if (this.hasNextSet) {
      this.currentSetIndex++;
    }
  }

  /**
   * Workout és exercise adatainak betöltése.
   */
  private loadExerciseDetail(exerciseId: number): void {
    this.message = '';
    this.messageType = '';

    this.exercisesService.getWorkoutExercises(this.programId, this.workoutId).subscribe({
      next: (response) => {
        const workout = response.data;

        this.workout = workout;

        if (!workout?.exercises || workout.exercises.length === 0) {
          this.message = 'userExerciseDetail.noExercise';
          this.messageType = 'info';
          return;
        }

        const found = workout.exercises.find((we) => we.exercise.id === exerciseId);

        if (!found) {
          this.message = 'userExerciseDetail.noExercise';
          this.messageType = 'info';
          return;
        }

        this.workoutExercise = found;
        const setCount = found.userWorkoutExerciseSets?.length || 0;
        this.currentSetIndex = setCount > 0 ? Math.min(this.currentSetIndex, setCount - 1) : 0;
        this.updateExerciseDone();
      },

      error: (err: unknown) => {
        const error = err as {
          error?: {
            message?: string;
          };
        };

        this.message = error.error?.message || 'userExerciseDetail.loadError';
        this.messageType = 'error';
      },
    });
  }

  /**
   * Egy set completed állapotának módosítása.
   */
  onSetCompletedChange(set: UserWorkoutExerciseSetDto, event: Event): void {
    const input = event.target as HTMLInputElement;
    this.updateSetCompleted(set, input.checked);
  }

  /**
   * Egy konkrét set completed állapotának
   * és aktuális adatainak frissítése a backendben.
   */
  updateSetCompleted(set: UserWorkoutExerciseSetDto, completed: boolean): void {
    if (!this.workoutExercise) {
      return;
    }

    const exerciseId = this.workoutExercise.exercise.id;

    this.message = '';
    this.messageType = '';

    this.exercisesService
      .updateSetCompleted(
        this.programId,
        this.workoutId,
        exerciseId,
        set.id,
        completed,
        set.actualRepetitions,
        set.actualWeightKg,
        set.notes,
      )
      .subscribe({
        next: () => {
          set.completed = completed;
          this.updateExerciseDone();
          this.message = 'userExerciseDetail.setUpdated';
          this.messageType = 'success';
        },

        error: (err: unknown) => {
          const error = err as {
            error?: {
              message?: string;
            };
          };

          this.message = error.error?.message || 'userExerciseDetail.setUpdateError';
          this.messageType = 'error';
        },
      });
  }

  /**
   * Az exercise akkor completed,
   * ha az összes saját set completed = true.
   */
  updateExerciseDone(): void {
    if (!this.workoutExercise) {
      return;
    }

    const sets: UserWorkoutExerciseSetDto[] = this.workoutExercise.userWorkoutExerciseSets;

    if (!sets || sets.length === 0) {
      this.workoutExercise.done = false;
      this.updateWorkoutDone();
      return;
    }

    this.workoutExercise.done = sets.every(
      (set: UserWorkoutExerciseSetDto) => set.completed === true,
    );

    this.updateWorkoutDone();
  }

  /**
   * A workout akkor completed,
   * ha az összes exercise completed.
   *
   * A tényleges workout completed állapotot
   * a backend kezeli és a USER_WORKOUTS táblában
   * tárolja.
   *
   * Ez a metódus csak a jelenlegi frontend
   * állapotot számolja újra.
   */
  updateWorkoutDone(): void {
    if (!this.workout) {
      return;
    }

    if (!this.workout.exercises?.length) {
      this.workout.done = false;
      return;
    }

    this.workout.done = this.workout.exercises.every((exercise) => exercise.done === true);
  }

  /**
   * Egy konkrét set tényleges adatainak mentése.
   *
   * A backend ugyanazt a /set-completed endpointot
   * használja az összes set adat mentésére.
   */
  saveSetDetails(set: UserWorkoutExerciseSetDto): void {
    if (!this.workoutExercise) {
      return;
    }

    const exerciseId = this.workoutExercise.exercise.id;

    this.message = '';
    this.messageType = '';

    this.exercisesService
      .updateSetCompleted(
        this.programId,
        this.workoutId,
        exerciseId,
        set.id,
        set.completed,
        set.actualRepetitions,
        set.actualWeightKg,
        set.notes,
      )
      .subscribe({
        next: () => {
          this.updateExerciseDone();
          this.message = 'userExerciseDetail.saveSuccess';
          this.messageType = 'success';
        },

        error: (err: unknown) => {
          const error = err as {
            error?: {
              message?: string;
            };
          };

          this.message = error.error?.message || 'userExerciseDetail.saveError';
          this.messageType = 'error';
        },
      });
  }
  goToSet(index: number): void {
    const sets = this.workoutExercise?.userWorkoutExerciseSets;

    if (!sets?.length || index < 0 || index >= sets.length) {
      return;
    }

    this.currentSetIndex = index;
  }
}
