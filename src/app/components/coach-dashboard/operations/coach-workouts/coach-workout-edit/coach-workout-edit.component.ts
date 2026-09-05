import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { CoachWorkoutsService } from '../../../../../services/coach/coach-workouts/coach-workouts.service';

import { WorkoutExerciseService } from '../../../../../services/coach/workout-exercises.service';

import { ExerciseService } from '../../../../../services/coach/coach-exercises/coach-exercises.service';

import { ProgramWorkoutService } from '../../../../../services/coach/program-workout.service';

import { USER_MESSAGES } from '../../../../../constants/user-messages';

import { Workout } from '../../../../../models/workout.model';

import { Exercise } from '../../../../../models/exercise.model';


@Component({
  selector: 'app-coach-workout-edit',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './coach-workout-edit.component.html',
  styleUrls: ['./coach-workout-edit.component.css']
})
export class CoachWorkoutEditComponent implements OnInit {

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
    done: undefined
  };


  // ==========================================================
  // ÜZENETEK
  // ==========================================================

  message: string = '';

  messageType:
    'success' |
    'error' |
    '' = '';


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
  workoutExercises: any[] = [];


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
    private programWorkoutService: ProgramWorkoutService
  ) {}


  // ==========================================================
  // INIT
  // ==========================================================

  ngOnInit(): void {

    this.workoutId = Number(
      this.route.snapshot.paramMap.get('id')
    );


    if (
      !this.workoutId ||
      this.workoutId <= 0
    ) {

      this.setMessage(
        'Érvénytelen workout ID.',
        'error'
      );

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

    this.programWorkoutService
      .isWorkoutAssignedToAnyProgram(this.workoutId)
      .subscribe({

        next: (response) => {

          this.workoutAssignedToProgram =
            response?.assigned === true;

          this.checkingProgramAssignment = false;

          console.log(
            'Workout programhoz tartozik:',
            this.workoutAssignedToProgram
          );

        },

        error: (error: any) => {

          console.error(
            'Hiba a workout programhoz tartozásának ellenőrzésekor:',
            error
          );

          this.workoutAssignedToProgram = false;
          this.checkingProgramAssignment = false;

        }

      });

  }


  // ==========================================================
  // WORKOUT BETÖLTÉSE
  // ==========================================================

  loadWorkout(): void {

    if (!this.workoutId) {
      return;
    }


    this.coachWorkoutsService
      .getWorkoutById(this.workoutId)
      .subscribe({

        next: (res) => {

          if (
            res.status === 'success' &&
            res.data
          ) {

            const w = res.data;


            /**
             * Backend ISO dátum ->
             * HTML date inputhoz YYYY-MM-DD.
             */
            const workoutDateFormatted =
              w.workoutDate
                ? w.workoutDate.split('T')[0]
                : undefined;


            this.workout = {

              ...this.workout,

              name:
                w.workoutName || '',

              workoutName:
                w.workoutName || '',

              description:
                w.workoutDescription || '',

              workoutDescription:
                w.workoutDescription || '',

              durationMinutes:
                w.durationMinutes || 0,

              difficultyLevel:
                w.difficultyLevel || '',

              programId:
              w.programId,

              workoutDate:
              workoutDateFormatted,

              intensityLevel:
              w.intensityLevel,

              dayIndex:
              w.dayIndex,

              completed:
              w.completed,

              performedAt:
              w.performedAt,

              actualSets:
              w.actualSets,

              actualRepetitions:
              w.actualRepetitions,

              weightUsed:
              w.weightUsed,

              durationSeconds:
              w.durationSeconds,

              feedback:
              w.feedback,

              notes:
              w.notes,

              done:
              w.done

            };

          } else {

            this.setMessage(
              res.message ||
              'Workout not found.',
              'error'
            );

          }

        },

        error: (error) => {

          console.error(
            'Hiba a workout betöltésekor:',
            error
          );


          this.setMessage(
            'Failed to load workout.',
            'error'
          );

        }

      });

  }


  // ==========================================================
  // ÖSSZES EXERCISE BETÖLTÉSE
  // ==========================================================

  loadExercises(): void {

    this.loadingExercises = true;


    this.exerciseService
      .getAllExercises()
      .subscribe({

        next: (exercises: Exercise[]) => {

          this.exercises =
            exercises || [];


          this.loadingExercises = false;

        },

        error: (error) => {

          console.error(
            'Hiba az exercise-ek betöltésekor:',
            error
          );


          this.exercises = [];

          this.loadingExercises = false;


          this.setMessage(
            'Nem sikerült betölteni az exercise-eket.',
            'error'
          );

        }

      });

  }


  // ==========================================================
  // WORKOUT EXERCISE-EK BETÖLTÉSE
  // ==========================================================

  loadWorkoutExercises(): void {

    if (!this.workoutId) {
      return;
    }


    this.exerciseService
      .getWorkoutExercises(this.workoutId)
      .subscribe({

        next: (workout: any) => {

          console.log(
            'Workout exercise-ek:',
            workout
          );


          /**
           * A backend a teljes workoutot adja vissza,
           * benne az exercises listával.
           */
          this.workoutExercises =
            workout?.exercises || [];


          console.log(
            'Betöltött WorkoutExercise-ek:',
            this.workoutExercises
          );

        },

        error: (error: any) => {

          console.error(
            'Hiba a workout exercise-ek betöltésekor:',
            error
          );


          this.workoutExercises = [];


          this.setMessage(
            'Nem sikerült betölteni a workout exercise-eit.',
            'error'
          );

        }

      });

  }


  // ==========================================================
  // WORKOUT EXERCISE ID LEKÉRÉSE
  // ==========================================================

  private getWorkoutExerciseId(
    workoutExercise: any
  ): number | null {

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


    if (
      workoutExercise.exercise?.id != null
    ) {

      return Number(
        workoutExercise.exercise.id
      );

    }


    if (
      workoutExercise.exerciseId != null
    ) {

      return Number(
        workoutExercise.exerciseId
      );

    }


    /**
     * Ha közvetlen Exercise objektumot
     * kapunk vissza.
     */
    if (
      workoutExercise.name != null &&
      workoutExercise.id != null
    ) {

      return Number(
        workoutExercise.id
      );

    }


    return null;

  }


  // ==========================================================
  // MÁR BENNE VAN-E AZ EXERCISE?
  // ==========================================================

  isExerciseAlreadyAdded(
    exerciseId: number
  ): boolean {

    return this.workoutExercises.some(
      workoutExercise => {

        const existingExerciseId =
          this.getWorkoutExerciseId(
            workoutExercise
          );


        return (
          existingExerciseId != null &&
          existingExerciseId ===
          Number(exerciseId)
        );

      }
    );

  }


  // ==========================================================
  // EXERCISE KIVÁLASZTÁSA
  // ==========================================================

  selectExercise(
    exerciseId: number | undefined
  ): void {

    if (exerciseId == null) {
      return;
    }


    if (this.workoutAssignedToProgram) {

      this.setMessage(
        'Ez a workout már programhoz van rendelve, ezért új exercise nem adható hozzá.',
        'error'
      );

      return;
    }


    this.selectedExerciseId =
      exerciseId;

  }


  // ==========================================================
  // KIVÁLASZTOTT EXERCISE NEVE
  // ==========================================================

  getSelectedExerciseName(): string {

    if (
      this.selectedExerciseId == null
    ) {
      return '';
    }


    const selectedExercise =
      this.exercises.find(
        exercise =>
          Number(exercise.id) ===
          Number(this.selectedExerciseId)
      );


    return selectedExercise?.name || '';

  }


  // ==========================================================
  // ELÉRHETŐ EXERCISE-EK
  // ==========================================================

  get availableExercises(): Exercise[] {

    const search =
      this.exerciseSearchTerm
        .trim()
        .toLocaleLowerCase('hu-HU');


    /*
     * Ha a workout már programban van,
     * nincs hozzáadható exercise.
     */
    if (this.workoutAssignedToProgram) {
      return [];
    }


    return this.exercises

      // Csak még hozzá nem adott exercise-ek.
      .filter(
        exercise =>
          exercise.id != null &&
          !this.isExerciseAlreadyAdded(
            exercise.id
          )
      )

      // Keresés név alapján.
      .filter(
        exercise => {

          if (!search) {
            return true;
          }


          const name =
            (
              exercise.name || ''
            )
              .toLocaleLowerCase(
                'hu-HU'
              );


          return name.includes(
            search
          );

        }
      )

      // ABC rendezés név szerint.
      .sort(
        (a, b) => {

          const nameA =
            (
              a.name || ''
            ).trim();


          const nameB =
            (
              b.name || ''
            ).trim();


          return nameA.localeCompare(
            nameB,
            'hu-HU',
            {
              sensitivity: 'base'
            }
          );

        }
      );

  }


  // ==========================================================
  // EXERCISE HOZZÁADÁSA A WORKOUT-HOZ
  // ==========================================================

  addExerciseToWorkout(): void {

    if (!this.workoutId) {

      this.setMessage(
        'Nincs érvényes workout ID.',
        'error'
      );

      return;

    }


    /*
     * Frontend oldali védelem.
     *
     * A backend védelem ettől függetlenül megmarad.
     */
    if (this.workoutAssignedToProgram) {

      this.setMessage(
        'Ez a workout már programhoz van rendelve, ezért új exercise nem adható hozzá.',
        'error'
      );

      return;
    }


    if (!this.selectedExerciseId) {

      this.setMessage(
        'Válassz ki egy exercise-t.',
        'error'
      );

      return;

    }


    if (
      this.isExerciseAlreadyAdded(
        this.selectedExerciseId
      )
    ) {

      this.setMessage(
        'Ez az exercise már hozzá van adva a workouthoz.',
        'error'
      );

      return;

    }


    this.addingExercise = true;


    this.workoutExerciseService
      .assignExerciseToWorkout(
        this.workoutId,
        this.selectedExerciseId
      )
      .subscribe({

        next: (response: any) => {

          console.log(
            'Exercise sikeresen hozzáadva a workouthoz:',
            {
              workoutId:
              this.workoutId,

              exerciseId:
              this.selectedExerciseId,

              response
            }
          );


          /**
           * Megkeressük a hozzáadott exercise-t.
           */
          const addedExercise =
            this.exercises.find(
              exercise =>
                Number(exercise.id) ===
                Number(
                  this.selectedExerciseId
                )
            );


          /**
           * Azonnali frontend frissítés.
           */
          if (addedExercise) {

            const alreadyExists =
              this.isExerciseAlreadyAdded(
                addedExercise.id!
              );


            if (!alreadyExists) {

              this.workoutExercises.push({

                id:
                  response?.id ??
                  response ??
                  0,

                workoutId:
                this.workoutId,

                exerciseId:
                addedExercise.id,

                exercise:
                addedExercise

              });

            }

          }


          this.selectedExerciseId =
            null;


          this.addingExercise = false;


          this.setMessage(
            'Exercise sikeresen hozzáadva a workouthoz.',
            'success'
          );

        },

        error: (error: any) => {

          console.error(
            'Hiba az exercise workoutba adásakor:',
            error
          );


          this.addingExercise = false;


          const backendMessage =
            error?.error?.message ??
            error?.error?.error ??
            error?.message;


          this.setMessage(
            backendMessage ||
            'Nem sikerült hozzáadni az exercise-t a workouthoz.',
            'error'
          );

        }

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

      workoutDate:
        this.workout.workoutDate
          ? new Date(
            this.workout.workoutDate
          ).toISOString()
          : undefined

    };


    this.coachWorkoutsService
      .updateWorkout(
        this.workoutId,
        payload
      )
      .subscribe({

        next: (res) => {

          if (
            res.status === 'success'
          ) {

            this.setMessage(
              'Workout updated successfully!',
              'success'
            );


            setTimeout(() => {

              this.router.navigate(
                ['/coach/dashboard']
              );

            }, 1500);

          } else {

            this.setMessage(
              res.message ||
              'Failed to update workout.',
              'error'
            );

          }

        },

        error: (error) => {

          console.error(
            'Hiba a workout mentésekor:',
            error
          );


          const backendMessage =
            error?.error?.message ??
            error?.error?.error ??
            error?.message;


          this.setMessage(
            backendMessage ||
            'Failed to save workout.',
            'error'
          );

        }

      });

  }


  // ==========================================================
  // CANCEL
  // ==========================================================

  cancelEdit(): void {

    this.router.navigate(
      ['/coach/dashboard']
    );

  }


  // ==========================================================
  // ÜZENET
  // ==========================================================

  private setMessage(
    msg: string,
    type: 'success' | 'error'
  ): void {

    this.message =
      msg;

    this.messageType =
      type;


    setTimeout(() => {

      this.message = '';

      this.messageType = '';

    }, 4000);

  }

}
