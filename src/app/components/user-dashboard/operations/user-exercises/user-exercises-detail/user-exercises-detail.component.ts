import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

import { UserExerciseDetailService } from '../../../../../services/user/user-exercises-detail/user-exercises-detail.service';
import { UserWorkoutDetailDto } from '../../../../../models/user-workout-exercise-detail.dto';

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
          console.error('Nincs exercise a workout-ban');
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

        console.log(
          'Talált workoutExercise:',
          this.workoutExercise
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
}
