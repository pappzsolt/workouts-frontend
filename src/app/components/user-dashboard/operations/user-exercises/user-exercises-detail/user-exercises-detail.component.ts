// user-exercises-detail.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { UserExerciseDetailService, WorkoutDto, ExerciseDto, WorkoutExerciseDto, ExerciseResponse } from '../../../../../services/user/user-exercises-detail/user-exercises-detail.service';

@Component({
  selector: 'app-user-exercise-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-exercises-detail.component.html',
  styleUrls: ['./user-exercises-detail.component.css']
})
export class UserExerciseDetailComponent implements OnInit {
  workoutExercise?: WorkoutExerciseDto; // A teljes objektum: sets, reps, done...
  workoutId!: number;

  constructor(
    private route: ActivatedRoute,
    private exercisesService: UserExerciseDetailService
  ) {}

  ngOnInit(): void {
    this.workoutId = Number(this.route.snapshot.paramMap.get('workoutId'));
    const exerciseId = Number(this.route.snapshot.paramMap.get('exerciseId'));

    this.exercisesService.getWorkoutExercises(this.workoutId).subscribe({
      next: workout => {
        if (!workout?.exercises || workout.exercises.length === 0) {
          console.error('Nincs exercise a workout-ban');
          return;
        }

        // Keresés exerciseId alapján
        const found = workout.exercises.find(we => we.exercise.id === exerciseId);

        if (!found) {
          console.error('Exercise nem található a workout-ban');
          return;
        }

        this.workoutExercise = found;
        console.log('Talált workoutExercise:', this.workoutExercise);
      },
      error: err => console.error('Hiba a workout lekérésekor:', err)
    });
  }

  onDoneChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (this.workoutExercise) {
      this.toggleDone(input.checked);
    }
  }

  toggleDone(checked: boolean) {
    if (!this.workoutExercise) return;

    this.exercisesService.updateExerciseDone(this.workoutId, this.workoutExercise.exercise.id, checked)
      .subscribe({
        next: updated => {
          if (updated.success) {
            this.workoutExercise!.done = checked;
          } else {
            console.error('Hiba a Done frissítésnél:', updated.message);
          }
        },
        error: err => console.error('Hiba a Done frissítésnél', err)
      });
  }
}
