import { Component, Input, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import { ExerciseService } from '../../../../../services/coach/coach-exercises/coach-exercises.service';
import { Exercise } from '../../../../../models/exercise.model';
import { SHARED_IMPORTS } from '../../../../shared/shared-imports';

@Component({
  selector: 'app-new-exercise',
  standalone: true,
  imports: [...SHARED_IMPORTS],
  templateUrl: './new-exercise.component.html',
  styleUrls: ['./new-exercise.component.css'],
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
    done: false,
  };

  message = '';
  messageType: 'success' | 'error' | '' = '';

  constructor(
    private exercisesService: ExerciseService,
    private translate: TranslateService,
  ) {}

  ngOnInit(): void {
    if (!this.workoutId) {
      this.message = this.translate.instant('newExercise.workoutIdRequired');
      this.messageType = 'error';
    }
  }

  addExercise(): void {
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
      durationSeconds: this.newExercise.durationSeconds,
    };

    this.exercisesService.addExercise(payload).subscribe({
      next: (res) => {
        this.message = this.translate.instant('newExercise.success', {
          name: res.name,
        });
        this.messageType = 'success';

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
          done: false,
        };
      },
      error: (err: HttpErrorResponse) => {
        if (err.error && typeof err.error === 'string') {
          this.message = this.translate.instant('newExercise.errorWithMessage', {
            message: err.error,
          });
        } else if (err.error && err.error.message) {
          this.message = this.translate.instant('newExercise.errorWithMessage', {
            message: err.error.message,
          });
        } else {
          this.message = this.translate.instant('newExercise.errorWithStatus', {
            status: err.status,
            statusText: err.statusText,
          });
        }

        this.messageType = 'error';
        console.error('Exercise creation error:', err);
      },
    });
  }
}
