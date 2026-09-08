import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { UserExerciseDetailService } from '../../../../../services/user/user-exercises-detail/user-exercises-detail.service';

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
export class UserExerciseDetailComponent implements OnInit {
  workout?: UserWorkoutDetailDto;

  workoutExercise?: UserWorkoutDetailDto['exercises'][number];

  workoutId!: number;
  programId!: number;

  constructor(
    private route: ActivatedRoute,
    private exercisesService: UserExerciseDetailService,
  ) {}

  ngOnInit(): void {
    this.workoutId = Number(this.route.snapshot.paramMap.get('workoutId'));

    const exerciseId = Number(this.route.snapshot.paramMap.get('exerciseId'));

    const navState = history.state;

    this.programId = Number(navState['programId']);

    this.exercisesService.getWorkoutExercises(this.programId, this.workoutId).subscribe({
      next: (workout) => {
        this.workout = workout;

        if (!workout?.exercises || workout.exercises.length === 0) {
          console.error('Nincs exercise a workout-ban');

          return;
        }

        const found = workout.exercises.find((we) => we.exercise.id === exerciseId);

        if (!found) {
          console.error('Exercise nem található a workout-ban:', exerciseId);

          return;
        }

        this.workoutExercise = found;

        // Az exercise done állapotának kiszámítása
        // a saját setek completed állapotából.
        this.updateExerciseDone();

        console.log('Talált workoutExercise:', this.workoutExercise);

        console.log('User workout exercise sets:', this.workoutExercise.userWorkoutExerciseSets);
      },

      error: (err: unknown) => {
        console.error('Hiba a workout lekérésekor:', err);
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
          // Csak sikeres backend válasz után
          // módosítjuk a frontend állapotát.
          set.completed = completed;

          // Exercise done újraszámolása.
          // Ez automatikusan újraszámolja a workout
          // completed állapotát is.
          this.updateExerciseDone();

          console.log('Set adatok frissítve:', {
            programId: this.programId,
            workoutId: this.workoutId,
            setId: set.id,
            completed,
            actualRepetitions: set.actualRepetitions,
            actualWeightKg: set.actualWeightKg,
            notes: set.notes,
          });
        },

        error: (err: unknown) => {
          console.error('Hiba a set adatainak frissítésekor:', err);
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

    // Workout állapot újraszámolása.
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

    console.log('Workout frontend completed:', {
      workoutId: this.workoutId,
      completed: this.workout.done,
    });

    if (this.workout.done) {
      localStorage.setItem(`workout-completed-${this.workoutId}`, 'true');

      console.log('Workout frontend completed elmentve:', this.workoutId);
    } else {
      // Ha valamelyik exercise újra incomplete,
      // töröljük a frontend completed állapotot.
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
          // Sikeres mentés után frissítjük
          // az exercise és workout állapotát.
          this.updateExerciseDone();

          console.log('Set sikeresen mentve:', {
            setId: set.id,
            completed: set.completed,
            actualRepetitions: set.actualRepetitions,
            actualWeightKg: set.actualWeightKg,
            notes: set.notes,
          });
        },

        error: (err: unknown) => {
          console.error('Hiba a set mentésekor:', err);
        },
      });
  }
}
