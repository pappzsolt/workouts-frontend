import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ExerciseService } from '../../../../../services/coach/coach-exercises/coach-exercises.service';
import { Exercise } from '../../../../../models/exercise.model';

@Component({
  selector: 'app-new-exercise',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './new-exercise.component.html',
  styleUrls: ['./new-exercise.component.css']
})
export class NewExerciseComponent implements OnInit {
  @Input() workoutId!: number;

  newExercise: Exercise = {
    name: '',
    description: '',
    imageUrl: '',
    videoUrl: '',
    muscleGroup: '',
    equipment: '',
    difficultyLevel: '',
    category: '',
    caloriesBurnedPerMinute: 0,
    durationSeconds: 0,
    done: false
  };

  message: string = '';
  messageType: 'success' | 'error' | '' = '';

  constructor(private exercisesService: ExerciseService) {}

  ngOnInit(): void {
    if (!this.workoutId) {
      this.message = 'Workout ID szükséges!';
      this.messageType = 'error';
    }
  }

  addExercise() {
    const payload = {
      name: this.newExercise.name,
      description: this.newExercise.description,
      imageUrl: this.newExercise.imageUrl,
      videoUrl: this.newExercise.videoUrl,
      muscleGroup: this.newExercise.muscleGroup,
      equipment: this.newExercise.equipment,
      difficultyLevel: this.newExercise.difficultyLevel,
      category: this.newExercise.category,
      caloriesBurnedPerMinute: this.newExercise.caloriesBurnedPerMinute,
      durationSeconds: this.newExercise.durationSeconds
    };

    this.exercisesService.addExercise(payload).subscribe({
      next: (res) => {
        this.message = `Gyakorlat "${res.name}" sikeresen hozzáadva!`;
        this.messageType = 'success';

        // Form reset
        this.newExercise = {
          name: '',
          description: '',
          imageUrl: '',
          videoUrl: '',
          muscleGroup: '',
          equipment: '',
          difficultyLevel: '',
          category: '',
          caloriesBurnedPerMinute: 0,
          durationSeconds: 0,
          done: false
        };
      },
      error: (err) => {
        // Hibák kezelése és üzenet a felhasználónak
        if (err.error && typeof err.error === 'string') {
          this.message = `Hiba történt: ${err.error}`;
        } else if (err.error && err.error.message) {
          this.message = `Hiba történt: ${err.error.message}`;
        } else {
          this.message = `Hiba történt (${err.status}): ${err.statusText}`;
        }
        this.messageType = 'error';
        console.error('Exercise creation error:', err);
      }
    });
  }

}
