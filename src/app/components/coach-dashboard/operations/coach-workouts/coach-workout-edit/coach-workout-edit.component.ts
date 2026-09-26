import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { CoachWorkoutsService } from '../../../../../services/coach/coach-workouts/coach-workouts.service';
import type { ApiResponse } from '../../../../../models/backend-dto/common/api-response';
import type { WorkoutDto as BackendWorkoutDto } from '../../../../../models/backend-dto/exercise/workout-dto';
import type { WorkoutDto as WorkoutUiDto } from '../../../../../models/exercise.model';
import { WorkoutExerciseService } from '../../../../../services/coach/workout-exercises.service';

import { ExerciseService } from '../../../../../services/coach/coach-exercises/coach-exercises.service';

import { ProgramWorkoutService } from '../../../../../services/coach/program-workout.service';
import { skip } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AppSelectComponent } from '../../../../../components/shared/components/app-select/app-select.component';
import { LanguageService } from '../../../../../services/shared/language.service';
import { USER_MESSAGES } from '../../../../../constants/user-messages';

import { Workout } from '../../../../../models/workout.model';

import { Exercise } from '../../../../../models/exercise.model';
import { HttpErrorResponse } from '@angular/common/http';

import { SHARED_IMPORTS } from '../../../../shared/shared-imports';

interface WorkoutExerciseView {
  id?: number;
  workoutId: number;
  exerciseId?: number;
  exercise?: Exercise;
  sets?: number;
  repetitions?: number;
  orderIndex?: number;
  restSeconds?: number;
  notes?: string;
  done?: boolean;
  name?: string;
}

@Component({
  selector: 'app-coach-workout-edit',
  standalone: true,
  imports: [...SHARED_IMPORTS, AppSelectComponent],
  templateUrl: './coach-workout-edit.component.html',
  styleUrls: ['./coach-workout-edit.component.css'],
})
export class CoachWorkoutEditComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  // ==========================================================
  // WORKOUT
  // ==========================================================

  workoutId?: number;

  workout: Workout = {
    name: '',
    workoutName: '',
    description: '',
    workoutDescription: '',
    durationMinutes: 0,
    difficultyLevel: '',
    programId: undefined,

    workoutDate: undefined,
    intensityLevel: undefined,
    dayIndex: undefined,
    completed: undefined,
    performedAt: undefined,
    actualSets: undefined,
    actualRepetitions: undefined,
    weightUsed: undefined,
    durationSeconds: undefined,
    feedback: undefined,
    notes: undefined,
    done: undefined,
  };

  // ==========================================================
  // ÜZENETEK
  // ==========================================================

  message: string = '';

  messageType: 'success' | 'error' | '' = '';

  // ==========================================================
  // PROGRAMHOZ TARTOZÁS
  // ==========================================================

  /**
   * Igaz, ha a workout már legalább egy programban szerepel.
   *
   * Ilyen esetben új exercise hozzáadása nem engedélyezett.
   */
  workoutAssignedToProgram: boolean = false;

  /**
   * A program-hozzárendelés ellenőrzésének állapota.
   */
  checkingProgramAssignment: boolean = false;

  // ==========================================================
  // EXERCISE-EK
  // ==========================================================

  /**
   * Az összes választható exercise.
   */
  exercises: Exercise[] = [];

  /**
   * Az aktuális workoutban már meglévő
   * WorkoutExercise kapcsolatok.
   */
  workoutExercises: WorkoutExerciseView[] = [];

  /**
   * Kiválasztott exercise ID.
   */
  selectedExerciseId: number | null = null;

  /**
   * Exercise keresés.
   */
  exerciseSearchTerm: string = '';

  /**
   * Exercise-ek betöltési állapota.
   */
  loadingExercises: boolean = false;

  /**
   * Exercise hozzáadás folyamatban van.
   */
  addingExercise: boolean = false;

  // ==========================================================
  // CONSTRUCTOR
  // ==========================================================

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private coachWorkoutsService: CoachWorkoutsService,
    private workoutExerciseService: WorkoutExerciseService,
    private exerciseService: ExerciseService,
    private programWorkoutService: ProgramWorkoutService,
    private languageService: LanguageService,
  ) {}

  // ==========================================================
  // INIT
  // ==========================================================

  ngOnInit(): void {
    this.languageService.language$
      .pipe(skip(1), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
      this.loadWorkout();
      this.loadExercises();
      this.loadWorkoutExercises();
      this.checkProgramAssignment();
    });

    this.workoutId = Number(this.route.snapshot.paramMap.get('id'));

    if (!this.workoutId || this.workoutId <= 0) {
      this.setMessage('coachWorkoutEdit.invalidWorkoutId', 'error');

      return;
    }

    // Workout betöltése
    this.loadWorkout();

    // Összes exercise betöltése
    this.loadExercises();

    // Workout jelenlegi exercise-einek betöltése
    this.loadWorkoutExercises();

    // Ellenőrizzük, hogy a workout programban van-e
    this.checkProgramAssignment();
  }

  // ==========================================================
  // PROGRAMHOZ TARTOZÁS ELLENŐRZÉSE
  // ==========================================================

  checkProgramAssignment(): void {
    if (!this.workoutId) {
      return;
    }

    this.checkingProgramAssignment = true;

    this.programWorkoutService.isWorkoutAssignedToAnyProgram(this.workoutId).subscribe({
      next: (response) => {
        this.workoutAssignedToProgram = response.success && response.data?.assigned === true;

        this.checkingProgramAssignment = false;

      },

      error: (error: HttpErrorResponse) => {
        console.error('Hiba a workout programhoz tartozásának ellenőrzésekor:', error);

        this.workoutAssignedToProgram = false;

        this.checkingProgramAssignment = false;
      },
    });
  }

  // ==========================================================
  // WORKOUT BETÖLTÉSE
  // ==========================================================

  loadWorkout(): void {
    if (!this.workoutId) {
      return;
    }

    this.coachWorkoutsService.getWorkoutById(this.workoutId).subscribe({
      next: (res: ApiResponse<BackendWorkoutDto>) => {
        if (!res.success || !res.data) {
          this.setMessage(res.message || 'coachWorkoutEdit.notFound', 'error');
          return;
        }

        const w = res.data;

        const workoutDateFormatted = w.workoutDate
          ? w.workoutDate.split('T')[0]
          : undefined;

        this.workout = {
          ...this.workout,
          id: w.id ?? this.workout.id,
          name: w.name ?? '',
          workoutName: w.name ?? '',
          description: w.description ?? '',
          workoutDescription: w.description ?? '',
          durationMinutes: w.durationMinutes ?? 0,
          workoutDate: workoutDateFormatted,
          intensityLevel: w.intensityLevel ?? undefined,
          done: w.done ?? undefined,
          exercises: [],
        };
      },

      error: (error) => {
        console.error('Hiba a workout betöltésekor:', error);

        this.setMessage('coachWorkoutEdit.loadError', 'error');
      },
    });
  }

  // ==========================================================
  // ÖSSZES EXERCISE BETÖLTÉSE
  // ==========================================================

  // ==========================================================
  // ÖSSZES EXERCISE BETÖLTÉSE
  // ==========================================================

  loadExercises(): void {
    this.loadingExercises = true;

    this.exerciseService.getAllExercises().subscribe({
      next: (response: ApiResponse<Exercise[]>) => {

        this.exercises = response.data ?? [];

        this.loadingExercises = false;
      },

      error: (error) => {
        console.error('Hiba az exercise-ek betöltésekor:', error);

        this.exercises = [];

        this.loadingExercises = false;

        this.setMessage('coachWorkoutEdit.loadExercisesError', 'error');
      },
    });
  }

  // ==========================================================
  // WORKOUT EXERCISE-EK BETÖLTÉSE
  // ==========================================================

  loadWorkoutExercises(): void {
    if (!this.workoutId) {
      return;
    }

    this.exerciseService.getWorkoutExercises(this.workoutId).subscribe({
      next: (workout: WorkoutUiDto) => {
        this.workoutExercises = (workout.exercises ?? [])
          .filter((item) => item.id != null && item.workoutId != null)
          .map((item) => ({
            id: item.id ?? undefined,
            workoutId: item.workoutId ?? this.workoutId!,
            exerciseId: item.exercise?.id ?? undefined,
            exercise: item.exercise
              ? {
                  id: item.exercise.id ?? undefined,
                  name: item.exercise.name ?? '',
                  description: item.exercise.description ?? undefined,
                  bodyPart: item.exercise.bodyPart ?? undefined,
                  synonyms: item.exercise.synonyms ?? undefined,
                  instructions: item.exercise.instructions ?? undefined,
                  tips: item.exercise.tips ?? undefined,
                  primaryMuscles: item.exercise.primaryMuscles ?? undefined,
                  secondaryMuscles: item.exercise.secondaryMuscles ?? undefined,
                  imageUrl: item.exercise.imageUrl ?? undefined,
                  videoUrl: item.exercise.videoUrl ?? undefined,
                  muscleGroup: item.exercise.muscleGroup ?? undefined,
                  equipment: item.exercise.equipment ?? undefined,
                  difficultyLevel: item.exercise.difficultyLevel ?? undefined,
                  category: item.exercise.category ?? undefined,
                  caloriesBurnedPerMinute: item.exercise.caloriesBurnedPerMinute ?? undefined,
                  durationSeconds: item.exercise.durationSeconds ?? undefined,
                  done: item.exercise.done ?? undefined,
                  forceType: item.exercise.forceType ?? undefined,
                  mechanic: item.exercise.mechanic ?? undefined,
                  isUnilateral: item.exercise.isUnilateral ?? undefined,
                  isBodyweight: item.exercise.isBodyweight ?? undefined,
                  variationGroup: item.exercise.variationGroup ?? undefined,
                }
              : undefined,
            sets: item.sets ?? undefined,
            repetitions: item.repetitions ?? undefined,
            orderIndex: item.orderIndex ?? undefined,
            restSeconds: item.restSeconds ?? undefined,
            notes: item.notes ?? undefined,
            done: item.done ?? undefined,
            name: item.exercise?.name ?? undefined,
          }));
      },

      error: (error: HttpErrorResponse) => {
        console.error('Hiba a workout exercise-ek betöltésekor:', error);

        this.workoutExercises = [];

        this.setMessage('coachWorkoutEdit.loadWorkoutExercisesError', 'error');
      },
    });
  }

  // ==========================================================
  // WORKOUT EXERCISE ID LEKÉRÉSE
  // ==========================================================

  private getWorkoutExerciseId(workoutExercise: WorkoutExerciseView): number | null {
    if (!workoutExercise) {
      return null;
    }

    /**
     * Normál WorkoutExercise response:
     *
     * {
     *   exerciseId: 123
     * }
     *
     * vagy:
     *
     * {
     *   exercise: {
     *     id: 123
     *   }
     * }
     */

    if (workoutExercise.exercise?.id != null) {
      return Number(workoutExercise.exercise.id);
    }

    if (workoutExercise.exerciseId != null) {
      return Number(workoutExercise.exerciseId);
    }

    /**
     * Ha közvetlen Exercise objektumot
     * kapunk vissza.
     */
    if (workoutExercise.name != null && workoutExercise.id != null) {
      return Number(workoutExercise.id);
    }

    return null;
  }

  // ==========================================================
  // MÁR BENNE VAN-E AZ EXERCISE?
  // ==========================================================

  isExerciseAlreadyAdded(exerciseId: number): boolean {
    return this.workoutExercises.some((workoutExercise) => {
      const existingExerciseId = this.getWorkoutExerciseId(workoutExercise);

      return existingExerciseId != null && existingExerciseId === Number(exerciseId);
    });
  }

  // ==========================================================
  // EXERCISE KIVÁLASZTÁSA
  // ==========================================================

  selectExercise(exerciseId: number | undefined): void {
    if (exerciseId == null) {
      return;
    }

    if (this.workoutAssignedToProgram) {
      this.setMessage('coachWorkoutEdit.workoutAssigned', 'error');

      return;
    }

    this.selectedExerciseId = exerciseId;
  }

  // ==========================================================
  // KIVÁLASZTOTT EXERCISE NEVE
  // ==========================================================

  getSelectedExerciseName(): string {
    if (this.selectedExerciseId == null) {
      return '';
    }

    const selectedExercise = this.exercises.find(
      (exercise) => Number(exercise.id) === Number(this.selectedExerciseId),
    );

    return selectedExercise?.name || '';
  }

  // ==========================================================
  // ELÉRHETŐ EXERCISE-EK
  // ==========================================================

  get availableExercises(): Exercise[] {
    const locale = this.languageService.getCurrentLanguage();
    const search = this.exerciseSearchTerm.trim().toLocaleLowerCase(locale);

    /*
     * Ha a workout már programban van,
     * nincs hozzáadható exercise.
     */
    if (this.workoutAssignedToProgram) {
      return [];
    }

    return (
      this.exercises

        // Csak még hozzá nem adott exercise-ek.
        .filter((exercise) => exercise.id != null && !this.isExerciseAlreadyAdded(exercise.id))

        // Keresés név alapján.
        .filter((exercise) => {
          if (!search) {
            return true;
          }

          const name = (exercise.name || '').toLocaleLowerCase(locale);

          return name.includes(search);
        })

        // ABC rendezés név szerint.
        .sort((a, b) => {
          const nameA = (a.name || '').trim();

          const nameB = (b.name || '').trim();

          return nameA.localeCompare(nameB, locale, {
            sensitivity: 'base',
          });
        })
    );
  }

  // ==========================================================
  // EXERCISE HOZZÁADÁSA A WORKOUT-HOZ
  // ==========================================================

  // ==========================================================
  // EXERCISE HOZZÁADÁSA A WORKOUT-HOZ
  // ==========================================================

  // ==========================================================
  // EXERCISE HOZZÁADÁSA A WORKOUT-HOZ
  // ==========================================================

  addExerciseToWorkout(): void {
    if (!this.workoutId) {
      this.setMessage('coachWorkoutEdit.invalidWorkoutId', 'error');

      return;
    }

    /*
     * Megvárjuk, amíg a programhoz tartozás
     * ellenőrzése befejeződik.
     */
    if (this.checkingProgramAssignment) {
      return;
    }

    /*
     * Frontend oldali védelem.
     *
     * A backend védelem ettől függetlenül megmarad.
     */
    if (this.workoutAssignedToProgram) {
      this.setMessage('coachWorkoutEdit.workoutAssigned', 'error');

      return;
    }

    if (!this.selectedExerciseId) {
      this.setMessage('coachWorkoutEdit.selectExercise', 'error');

      return;
    }

    if (this.isExerciseAlreadyAdded(this.selectedExerciseId)) {
      this.setMessage('coachWorkoutEdit.exerciseAlreadyAdded', 'error');

      return;
    }

    const exerciseId = this.selectedExerciseId;
    const workoutId = this.workoutId;

    if (workoutId == null) {
      this.setMessage('coachWorkoutEdit.workoutIdMissing', 'error');
      return;
    }

    this.addingExercise = true;

    this.workoutExerciseService.assignExerciseToWorkout(workoutId, exerciseId).subscribe({
      next: (response: ApiResponse<void>) => {

        const addedExercise = this.exercises.find(
          (exercise) => Number(exercise.id) === Number(exerciseId),
        );

        /*
         * Azonnali frontend frissítés.
         *
         * A backend jelenleg nem küld vissza
         * WorkoutExercise objektumot, ezért
         * csak a szükséges adatokat tesszük be.
         */
        if (addedExercise && !this.isExerciseAlreadyAdded(exerciseId)) {
          this.workoutExercises.push({
            workoutId,
            exerciseId: addedExercise.id,
            exercise: addedExercise,
            sets: addedExercise.sets ?? 0,
            repetitions: addedExercise.repetitions ?? 0,
            orderIndex: this.workoutExercises.length,
            restSeconds: 0,
            done: false,
          });
        }

        this.selectedExerciseId = null;

        this.addingExercise = false;

        this.setMessage('coachWorkoutEdit.addSuccess', 'success');
      },

      error: (error: HttpErrorResponse) => {
        console.error('Hiba az exercise workoutba adásakor:', error);

        this.addingExercise = false;

        const backendMessage = error?.error?.message ?? error?.error?.error ?? error?.message;

        this.setMessage(backendMessage || 'coachWorkoutEdit.addError', 'error');
      },
    });
  }

  // ==========================================================
  // WORKOUT MENTÉSE
  // ==========================================================

  saveWorkout(): void {
    if (!this.workoutId) {
      return;
    }

    const payload: Workout = {
      ...this.workout,

      workoutDate: this.workout.workoutDate
        ? new Date(this.workout.workoutDate).toISOString()
        : undefined,
    };

    this.coachWorkoutsService.updateWorkout(this.workoutId, payload).subscribe({
      next: (res) => {
        if (res.done === true) {
          this.setMessage('coachWorkoutEdit.updateSuccess', 'success');

          setTimeout(() => {
            this.router.navigate(['/coach/dashboard']);
          }, 1500);
        } else {
          this.setMessage(res.message || 'coachWorkoutEdit.updateError', 'error');
        }
      },

      error: (error) => {
        console.error('Hiba a workout mentésekor:', error);

        const backendMessage = error?.error?.message ?? error?.error?.error ?? error?.message;

        this.setMessage(backendMessage || 'coachWorkoutEdit.saveError', 'error');
      },
    });
  }

  // ==========================================================
  // CANCEL
  // ==========================================================

  cancelEdit(): void {
    this.router.navigate(['/coach/dashboard']);
  }

  // ==========================================================
  // ÜZENET
  // ==========================================================

  private setMessage(msg: string, type: 'success' | 'error'): void {
    this.message = msg;

    this.messageType = type;

    setTimeout(() => {
      this.message = '';

      this.messageType = '';
    }, 4000);
  }
}
