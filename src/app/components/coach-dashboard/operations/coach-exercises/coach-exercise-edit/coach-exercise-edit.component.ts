import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ExerciseService } from '../../../../../services/coach/coach-exercises/coach-exercises.service';
import { Exercise } from '../../../../../models/exercise.model';
import type { ApiResponse } from '../../../../../models/backend-dto/common/api-response';
import type { ExerciseDto } from '../../../../../models/backend-dto/exercise/exercise-dto';

import { LanguageService } from '../../../../../services/shared/language.service';

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
  // ==========================================================
  // DESTROY REF
  // ==========================================================

  private readonly destroyRef = inject(DestroyRef);

  // ==========================================================
  // EXERCISE
  // ==========================================================

  exercise: Exercise = {
    id: 0,

    // ==========================================================
    // FORDÍTOTT ADATOK
    // ==========================================================

    name: '',
    description: '',
    bodyPart: '',
    synonyms: '',
    instructions: '',
    tips: '',
    primaryMuscles: '',
    secondaryMuscles: '',

    // ==========================================================
    // KÖZÖS EXERCISE ADATOK
    // ==========================================================

    imageUrl: '',
    videoUrl: '',
    muscleGroup: '',
    equipment: '',
    difficultyLevel: '',
    category: '',
    caloriesBurnedPerMinute: 0,
    durationSeconds: 0,
    done: false,
    forceType: '',
    mechanic: '',
    isUnilateral: false,
    isBodyweight: false,
    variationGroup: '',
  };

  loading = false;
  saving = false;
  exerciseFound = false;
  currentLanguage = 'hu';

  // ==========================================================
  // ÜZENET
  // ==========================================================

  message = '';

  messageType: 'success' | 'error' | 'info' | '' = '';

  // ==========================================================
  // CONSTRUCTOR
  // ==========================================================

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private exerciseService: ExerciseService,
    private languageService: LanguageService,
  ) {}

  // ==========================================================
  // INIT
  // ==========================================================

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    if (!id) {
      this.showError('coachExerciseEdit.notFound');
      return;
    }

    // ==========================================================
    // AKTUÁLIS NYELV ÉS NYELVVÁLTÁS
    // ==========================================================

    this.languageService.language$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((language) => {
        this.currentLanguage = language;
        this.loadExercise(id, language);
      });
  }

  // ==========================================================
  // EXERCISE BETÖLTÉS
  // ==========================================================

  loadExercise(exerciseId: number, language: string): void {
    this.loading = true;
    this.clearMessage();

    this.exerciseService.getAllExercises(language).subscribe({
      next: (response: ApiResponse<Exercise[]>) => {

        const exercises = response.data ?? [];


        const exercise = exercises.find((item) => item.id === exerciseId);

        if (exercise) {
          this.exercise = {
            ...exercise,
          };

          this.exerciseFound = true;
        } else {
          this.exerciseFound = false;

          this.router.navigate(['/coach/dashboard'], {
            queryParams: {
              section: 'exercises',
              exerciseNotFound: 'true',
            },
          });
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

  // ==========================================================
  // EXERCISE MENTÉS
  // ==========================================================

  saveExercise(): void {
    this.saving = true;
    this.clearMessage();

    this.exerciseService
      .updateExercise(this.exercise, this.currentLanguage)
      .subscribe({
        next: (response) => {

          // A backend a módosított ExerciseDto-t az ApiResponse.data
          // mezőben adja vissza. Ezt visszatesszük a form modelljébe,
          // hogy a szerver által normalizált értékek is megjelenjenek.
          if (response.data) {
            const updated: ExerciseDto = response.data;

            this.exercise = {
              ...this.exercise,
              id: updated.id ?? this.exercise.id,
              name: updated.name ?? this.exercise.name,
              description: updated.description ?? undefined,
              bodyPart: updated.bodyPart ?? undefined,
              synonyms: updated.synonyms ?? undefined,
              instructions: updated.instructions ?? undefined,
              tips: updated.tips ?? undefined,
              primaryMuscles: updated.primaryMuscles ?? undefined,
              secondaryMuscles: updated.secondaryMuscles ?? undefined,
              imageUrl: updated.imageUrl ?? undefined,
              videoUrl: updated.videoUrl ?? undefined,
              muscleGroup: updated.muscleGroup ?? undefined,
              equipment: updated.equipment ?? undefined,
              difficultyLevel: updated.difficultyLevel ?? undefined,
              category: updated.category ?? undefined,
              caloriesBurnedPerMinute: updated.caloriesBurnedPerMinute ?? undefined,
              durationSeconds: updated.durationSeconds ?? undefined,
              done: updated.done ?? undefined,
              forceType: updated.forceType ?? undefined,
              mechanic: updated.mechanic ?? undefined,
              isUnilateral: updated.isUnilateral ?? undefined,
              isBodyweight: updated.isBodyweight ?? undefined,
              variationGroup: updated.variationGroup ?? undefined,
            };
          }

          this.showSuccess('coachExerciseEdit.saveSuccess');

          this.saving = false;
        },

        error: (err) => {
        console.error('Hiba az exercise frissítésénél:', err);

        this.showError('coachExerciseEdit.saveError');

        this.saving = false;
      },
    });
  }

  // ==========================================================
  // MESSAGE SEGÉDMETÓDUSOK
  // ==========================================================

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
