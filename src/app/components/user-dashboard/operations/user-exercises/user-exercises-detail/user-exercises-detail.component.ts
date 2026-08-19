import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

import { UserExerciseDetailService } from '../../../../../services/user/user-exercises-detail/user-exercises-detail.service';

import {
  UserWorkoutDetailDto,
  UserWorkoutExerciseSetDto
} from '../../../../../models/user-workout-exercise-detail.dto';

@Component({
  selector: 'app-user-exercise-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-exercises-detail.component.html',
  styleUrls: ['./user-exercises-detail.component.css']
})
export class UserExerciseDetailComponent implements OnInit {

  workoutExercise?: UserWorkoutDetailDto['exercises'][number];

  workoutId!: number;

  constructor(
    private route: ActivatedRoute,
    private exercisesService: UserExerciseDetailService
  ) {}

  ngOnInit(): void {

    this.workoutId = Number(
      this.route.snapshot.paramMap.get('workoutId')
    );

    const exerciseId = Number(
      this.route.snapshot.paramMap.get('exerciseId')
    );

    this.exercisesService.getWorkoutExercises(this.workoutId).subscribe({

      next: workout => {

        if (!workout?.exercises || workout.exercises.length === 0) {

          console.error(
            'Nincs exercise a workout-ban'
          );

          return;
        }

        const found = workout.exercises.find(
          we => we.exercise.id === exerciseId
        );

        if (!found) {

          console.error(
            'Exercise nem található a workout-ban:',
            exerciseId
          );

          return;
        }

        this.workoutExercise = found;

        // Az exercise done állapotát
        // a saját setek completed állapotából számoljuk.
        this.updateExerciseDone();

        console.log(
          'Talált workoutExercise:',
          this.workoutExercise
        );

        console.log(
          'User workout exercise sets:',
          this.workoutExercise.userWorkoutExerciseSets
        );
      },

      error: err => {

        console.error(
          'Hiba a workout lekérésekor:',
          err
        );
      }
    });
  }

  /**
   * Egy set completed állapotának módosítása.
   */
  onSetCompletedChange(
    set: UserWorkoutExerciseSetDto,
    event: Event
  ): void {

    const input = event.target as HTMLInputElement;

    this.updateSetCompleted(
      set,
      input.checked
    );
  }

  /**
   * Egy konkrét set completed állapotának frissítése
   * a backendben.
   */
  updateSetCompleted(
    set: UserWorkoutExerciseSetDto,
    completed: boolean
  ): void {

    if (!this.workoutExercise) {
      return;
    }

    const exerciseId =
      this.workoutExercise.exercise.id;

    this.exercisesService.updateSetCompleted(
      this.workoutId,
      exerciseId,
      set.id,
      completed
    ).subscribe({

      next: () => {

        // Csak sikeres backend válasz után
        // módosítjuk a frontend állapotát.
        set.completed = completed;

        // Exercise done újraszámolása.
        this.updateExerciseDone();

        console.log(
          'Set completed állapot frissítve:',
          {
            setId: set.id,
            completed
          }
        );
      },

      error: err => {

        console.error(
          'Hiba a set completed állapotának frissítésekor:',
          err
        );
      }
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

    const sets: UserWorkoutExerciseSetDto[] =
      this.workoutExercise.userWorkoutExerciseSets;

    if (!sets || sets.length === 0) {

      this.workoutExercise.done = false;

      return;
    }

    this.workoutExercise.done =
      sets.every(
        (set: UserWorkoutExerciseSetDto) =>
          set.completed === true
      );
  }
}
