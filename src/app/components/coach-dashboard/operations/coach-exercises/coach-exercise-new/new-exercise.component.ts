import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
    if (!this.workoutId) return;

    this.newExercise.workoutId = this.workoutId;
    this.exercisesService.addExercise(this.newExercise).subscribe({
      next: (res) => {
        this.message = `Gyakorlat "${res.name}" sikeresen hozzáadva!`;
        this.messageType = 'success';
        this.newExercise = {
          name: '',
          description: '',
          sets: 0,
          repetitions: 0,
          duration_minutes: 0,
          intensity_level: '',
          workoutId: this.workoutId,
          done: false
        };
      },
      error: () => {
        this.message = 'Hiba történt a gyakorlat hozzáadásakor';
        this.messageType = 'error';
      }
    });
  }
}
