import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { ExerciseService } from '../../../../../services/coach/coach-exercises/coach-exercises.service';
import { Exercise } from '../../../../../models/exercise.model';
import { ApiResponse } from '../../../../../models/api-response.model';

import { SHARED_IMPORTS } from '../../../../shared/shared-imports';

@Component({
  selector: 'app-coach-exercise-edit',
  standalone: true,
  imports: [...SHARED_IMPORTS],
  templateUrl: './coach-exercise-edit.component.html',
  styleUrls: ['./coach-exercise-edit.component.css'],
})
export class CoachExerciseEditComponent implements OnInit {
  exercise: Exercise = {
    id: 0,
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
  };

  loading: boolean = false;
  saving: boolean = false;
  errorMessage: string = '';

  // Message változók a template-hez
  message: string | null = null;
  messageType: 'success' | 'error' | null = null;

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private exerciseService: ExerciseService,
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    if (id) {
      this.loadExercise(id);
    }
  }

  loadExercise(exerciseId: number): void {
    this.loading = true;

    this.exerciseService.getAllExercises().subscribe({
      next: (response: ApiResponse<Exercise[]>) => {
        const exercises = response.data ?? [];

        const ex = exercises.find((e) => e.id === exerciseId);

        if (ex) {
          this.exercise = { ...ex };
        } else {
          this.errorMessage = 'coachExerciseEdit.notFound';
        }

        this.loading = false;
      },

      error: (err) => {
        console.error('Hiba az exercise betöltésénél:', err);

        this.errorMessage = 'coachExerciseEdit.loadError';

        this.loading = false;
      },
    });
  }

  saveExercise(): void {
    this.saving = true;

    this.exerciseService.updateExercise(this.exercise).subscribe({
      next: (updated) => {
        console.log('Exercise frissítve:', updated);

        this.message = 'coachExerciseEdit.saveSuccess';

        this.messageType = 'success';
        this.saving = false;

        this.router.navigate(['/coach/exercises']);
      },

      error: (err) => {
        console.error('Hiba az exercise frissítésénél:', err);

        this.message = 'coachExerciseEdit.saveError';

        this.messageType = 'error';
        this.saving = false;
      },
    });
  }
}
