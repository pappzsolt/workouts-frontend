import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { Subject, takeUntil } from 'rxjs';

import { UserExerciseDetailService } from '../../../../../services/user/user-exercises-detail/user-exercises-detail.service';

import { LanguageService } from '../../../../../services/shared/language.service';

import {
  UserWorkoutDetailDto,
  UserWorkoutExerciseSetDto,
} from '../../../../../models/user-workout-exercise-detail.dto';

import { SHARED_IMPORTS } from '../../../../shared/shared-imports';

@Component({
  selector: 'app-user-exercise-detail',
  standalone: true,
  imports: [...SHARED_IMPORTS],
  templateUrl: './user-exercises-detail.component.html',
  styleUrls: ['./user-exercises-detail.component.css'],
})
export class UserExerciseDetailComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  workout?: UserWorkoutDetailDto;

  workoutExercise?: UserWorkoutDetailDto['exercises'][number];

  workoutId!: number;
  programId!: number;

  message = '';
  messageType: 'success' | 'error' | 'info' | '' = '';

  constructor(
    private route: ActivatedRoute,
    private exercisesService: UserExerciseDetailService,
    private languageService: LanguageService,
  ) {}

  ngOnInit(): void {
    this.workoutId = Number(this.route.snapshot.paramMap.get('workoutId'));

    const exerciseId = Number(this.route.snapshot.paramMap.get('exerciseId'));

    const navState = history.state;

    this.programId = Number(navState['programId']);

    this.loadExerciseDetail(exerciseId);

    this.languageService.language$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.loadExerciseDetail(exerciseId);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Workout és exercise adatainak betöltése.
   */
  private loadExerciseDetail(exerciseId: number): void {
    this.message = '';
    this.messageType = '';

    this.exercisesService.getWorkoutExercises(this.programId, this.workoutId).subscribe({
      next: (response) => {
        /*
         * Backend válasz:
         *
         * {
         *   success: true,
         *   data: {
         *     ...
         *   },
         *   message: null
         * }
         *
         * Ezért a tényleges workout:
         *
         * response.data
         */
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

        /*
         * Az exercise done állapotának
         * kiszámítása a saját setek
         * completed állapotából.
         */
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
          /*
           * Csak sikeres backend válasz után
           * módosítjuk a frontend állapotát.
           */
          set.completed = completed;

          /*
           * Exercise done újraszámolása.
           *
           * Ez automatikusan újraszámolja
           * a workout completed állapotát is.
           */
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

    /*
     * Workout állapot újraszámolása.
     */
    this.updateWorkoutDone();
  }

  /**
   * A workout akkor completed,
   * ha az összes exercise completed.
   *
   * Ez csak frontend állapot.
   * A backend workout completed mezőjét
   * nem módosítjuk.
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

    if (this.workout.done) {
      localStorage.setItem(`workout-completed-${this.workoutId}`, 'true');
    } else {
      /*
       * Ha valamelyik exercise újra incomplete,
       * töröljük a frontend completed állapotot.
       */
      localStorage.removeItem(`workout-completed-${this.workoutId}`);
    }
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
          /*
           * Sikeres mentés után frissítjük
           * az exercise és workout állapotát.
           */
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
}
