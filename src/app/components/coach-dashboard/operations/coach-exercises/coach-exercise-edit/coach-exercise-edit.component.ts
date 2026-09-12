import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { ExerciseService } from '../../../../../services/coach/coach-exercises/coach-exercises.service';
import { Exercise } from '../../../../../models/exercise.model';
import { ApiResponse } from '../../../../../models/api-response.model';

import { MessageComponent } from '../../../../shared/message/message.component';
import { SHARED_IMPORTS } from '../../../../shared/shared-imports';

@Component({
  selector: 'app-coach-exercise-edit',
  standalone: true,
  imports: [...SHARED_IMPORTS, MessageComponent],
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

  loading = false;
  saving = false;

  // =============================
  // ÜZENET
  // =============================

  message = '';

  messageType: 'success' | 'error' | 'info' | '' = '';

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private exerciseService: ExerciseService,
  ) {}

  // =============================
  // INIT
  // =============================

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    if (!id) {
      this.showError('coachExerciseEdit.notFound');

      return;
    }

    this.loadExercise(id);
  }

  // =============================
  // EXERCISE BETÖLTÉS
  // =============================

  loadExercise(exerciseId: number): void {
    this.loading = true;

    this.clearMessage();

    this.exerciseService.getAllExercises().subscribe({
      next: (response: ApiResponse<Exercise[]>) => {
        const exercises = response.data ?? [];

        const exercise = exercises.find((item) => item.id === exerciseId);

        if (exercise) {
          this.exercise = {
            ...exercise,
          };
        } else {
          this.showError('coachExerciseEdit.notFound');
        }

        this.loading = false;
      },

      error: (err) => {
        console.error('Hiba az exercise betöltésénél:', err);

        this.showError('coachExerciseEdit.loadError');

        this.loading = false;
      },
    });
  }

  // =============================
  // EXERCISE MENTÉS
  // =============================

  saveExercise(): void {
    this.saving = true;

    this.clearMessage();

    this.exerciseService.updateExercise(this.exercise).subscribe({
      next: (updated) => {
        console.log('Exercise frissítve:', updated);

        this.showSuccess('coachExerciseEdit.saveSuccess');

        this.saving = false;

        /*
         * FONTOS:
         *
         * Itt korábban azonnal navigáltunk:
         *
         * this.router.navigate(['/coach/exercises']);
         *
         * Emiatt a sikerüzenet nem volt látható.
         *
         * Egyelőre itt maradunk az oldalon,
         * hogy a MessageComponent meg tudja
         * jeleníteni az üzenetet.
         */
      },

      error: (err) => {
        console.error('Hiba az exercise frissítésénél:', err);

        this.showError('coachExerciseEdit.saveError');

        this.saving = false;
      },
    });
  }

  // =============================
  // MESSAGE SEGÉDMETÓDUSOK
  // =============================

  private showSuccess(message: string): void {
    this.message = message;

    this.messageType = 'success';
  }

  private showError(message: string): void {
    this.message = message;

    this.messageType = 'error';
  }

  private clearMessage(): void {
    this.message = '';

    this.messageType = '';
  }
}
