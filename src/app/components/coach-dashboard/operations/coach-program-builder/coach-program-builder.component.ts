import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { ExerciseService } from
    '../../../../services/coach/coach-exercises/coach-exercises.service';

import { CoachExercisesBoardComponent } from
    '../../../shared/coach/coach-exercises-board/coach-exercises-board.component';

import { CoachProgramService } from
    '../../../../services/coach/coach-program/coach-program.service';

import { ProgramWorkoutService } from
    '../../../../services/coach/program-workout.service';

import { WorkoutExerciseService } from
    '../../../../services/coach/workout-exercises.service';

import { AssignProgramService } from
    '../../../../services/coach/assign-program/assignprogram.service';

import { UserSelectComponent } from
    '../../../shared/user/user-select.component';

import {
  Exercise,
  WorkoutDto,
  WorkoutExercise
} from '../../../../models/exercise.model';

import {
  ProgramCreationRequest
} from '../../../../models/program.model';

import {
  ProgramWorkout
} from '../../../../models/program-workout.model';


@Component({
  selector: 'app-coach-program-builder',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CoachExercisesBoardComponent,
    UserSelectComponent,
  ],
  templateUrl: './coach-program-builder.component.html',
  styleUrl: './coach-program-builder.component.css'
})
export class CoachProgramBuilderComponent implements OnInit {

  currentStep = 1;


  // ==========================================================
  // PROGRAM ADATOK
  // ==========================================================

  programName = '';
  programDescription = '';
  selectedUserId?: number;
  durationDays: number | null = null;
  difficultyLevel = '';

  programId: number | null = null;

  creatingProgram = false;


  // ==========================================================
  // WORKOUTOK
  // ==========================================================

  workouts: WorkoutDto[] = [];

  exercises: Exercise[] = [];

  selectedExercises: Exercise[] = [];

  /**
   * A jelenleg kiválasztott workoutban
   * már meglévő WorkoutExercise kapcsolatokat tárolja.
   */
  selectedWorkoutExercises: WorkoutExercise[] = [];

  selectedWorkoutId: number | null = null;

  selectedWorkout: WorkoutDto | null = null;

  selectedWorkouts: WorkoutDto[] = [];

  loadingWorkouts = false;

  loadingExercises = false;

  /**
   * true:
   *   az aktuálisan kiválasztott workout újonnan létrehozott workout.
   *
   * false:
   *   meglévő workout.
   *
   * Meglévő workout esetén az exercise-ek LOCKOLVA vannak.
   */
  isNewWorkout = false;


  // ==========================================================
  // PROGRAM WORKOUT KAPCSOLATOK
  // ==========================================================

  /**
   * A backend által visszaadott program-workout
   * kapcsolatokat tároljuk itt.
   *
   * Ebben van:
   * - id
   * - programId
   * - workoutId
   * - dayIndex
   */
  programWorkouts: ProgramWorkout[] = [];


  constructor(
    private exerciseService: ExerciseService,
    private coachProgramService: CoachProgramService,
    private programWorkoutService: ProgramWorkoutService,
    private workoutExerciseService: WorkoutExerciseService,
    private route: ActivatedRoute,
    private router: Router,
    private assignProgramService: AssignProgramService,
  ) {}


  // ==========================================================
  // INIT
  // ==========================================================

// ==========================================================
// INIT
// ==========================================================

  ngOnInit(): void {

    // Exercise-ok betöltése
    this.loadExercises();

    const programId =
      this.route.snapshot.queryParamMap.get('programId');

    const newWorkoutId =
      this.route.snapshot.queryParamMap.get('newWorkoutId');


    // ----------------------------------------------------------
    // MEGLÉVŐ PROGRAM
    // ----------------------------------------------------------

    if (programId) {

      const parsedProgramId = Number(programId);

      if (
        Number.isNaN(parsedProgramId) ||
        parsedProgramId <= 0
      ) {

        console.error(
          'Érvénytelen program ID:',
          programId
        );

        return;
      }

      this.programId = parsedProgramId;

      console.log(
        'Meglévő program betöltése:',
        this.programId
      );


      /**
       * Betöltjük a meglévő program adatait:
       *
       * - programName
       * - programDescription
       * - durationDays
       * - difficultyLevel
       *
       * Fontos:
       * ez csak SELECT / GET.
       * Itt még semmilyen INSERT vagy UPDATE nem történik.
       */
      this.loadProgram();


      /**
       * Ha új workout létrehozása után érkeztünk vissza,
       * akkor közvetlenül a 2. lépésre kell menni.
       *
       * Például:
       *
       * /coach/program-builder
       * ?programId=203
       * &newWorkoutId=279
       *
       * Ebben az esetben a program már létezik,
       * és csak az új workouttal folytatjuk.
       */
      if (newWorkoutId) {

        const workoutId = Number(newWorkoutId);

        if (
          !Number.isNaN(workoutId) &&
          workoutId > 0
        ) {

          console.log(
            'Újonnan létrehozott workout ID:',
            workoutId
          );

          this.isNewWorkout = true;

          // Közvetlenül a workout lépésre megyünk.
          this.currentStep = 2;

        } else {

          console.error(
            'Érvénytelen newWorkoutId:',
            newWorkoutId
          );

          // Hibás newWorkoutId esetén
          // normál program-szerkesztési mód.
          this.currentStep = 1;

        }

      } else {

        /**
         * Sima meglévő program szerkesztése.
         *
         * Itt az 1. lépés jelenik meg,
         * a program adataival kitöltve.
         *
         * A következő gomb megnyomásakor
         * updateProgram() fog lefutni.
         */
        this.currentStep = 1;

      }


      // A programhoz tartozó workoutokat is betöltjük.
      this.loadWorkouts();

      return;
    }


    // ----------------------------------------------------------
    // NORMÁL BELÉPÉS
    // ----------------------------------------------------------

    /**
     * Nincs programId:
     *
     * Ez új program létrehozása.
     *
     * A currentStep marad 1.
     */
    this.currentStep = 1;

    this.loadWorkouts();
  }


  // ==========================================================
  // PROGRAM BETÖLTÉSE
  // ==========================================================

  loadProgram(): void {

    if (this.programId === null) {

      console.error(
        'Nincs program ID.'
      );

      return;
    }

    this.coachProgramService
      .getProgramById(this.programId)
      .subscribe({

        next: (response) => {

          console.log(
            'Program betöltve:',
            response
          );

          if (
            response &&
            response.status === 'success' &&
            response.data
          ) {

            const program = response.data;

            this.programName =
              program.programName ?? '';

            this.programDescription =
              program.programDescription ?? '';

            this.durationDays =
              program.durationDays ?? null;

            this.difficultyLevel =
              program.difficultyLevel ?? '';

            console.log(
              'Program adatok betöltve:',
              {
                programName: this.programName,
                programDescription: this.programDescription,
                durationDays: this.durationDays,
                difficultyLevel: this.difficultyLevel
              }
            );

            // ======================================================
            // PROGRAMHOZ RENDELT USER BETÖLTÉSE
            // ======================================================

            this.assignProgramService
              .getAssignedUserId(this.programId!)
              .subscribe({

                next: (userResponse) => {

                  console.log(
                    'Programhoz rendelt user:',
                    userResponse
                  );

                  this.selectedUserId =
                    userResponse.data ?? undefined;

                  console.log(
                    'selectedUserId:',
                    this.selectedUserId
                  );
                },

                error: (error: any) => {

                  console.error(
                    'Hiba a programhoz rendelt user betöltésekor:',
                    error
                  );

                  this.selectedUserId =
                    undefined;
                }

              });

          } else {

            console.error(
              'A program nem tölthető be:',
              response
            );

          }

        },

        error: (error: any) => {

          console.error(
            'Hiba a program betöltésekor:',
            error
          );

        }

      });
  }


  // ==========================================================
  // ÚJ WORKOUT LÉTREHOZÁSA
  // ==========================================================

  goToCreateWorkout(): void {

    if (this.programId === null) {

      console.error(
        'Nincs program ID.'
      );

      return;
    }

    this.router.navigate(
      ['/coach/workouts/new'],
      {
        queryParams: {
          fromProgramBuilder: 'true',
          programId: this.programId
        }
      }
    );
  }


  // ==========================================================
  // PROGRAM BEFEJEZÉSE
  // ==========================================================

  finishProgram(): void {

    if (this.programId === null) {

      console.error(
        'Nincs program ID.'
      );

      return;
    }

    if (!this.selectedUserId) {

      console.error(
        'Nincs kiválasztott felhasználó.'
      );

      return;
    }

    this.assignProgramService
      .assignProgramToUser(
        this.selectedUserId,
        this.programId
      )
      .subscribe({

        next: () => {

          this.router.navigate(
            ['/coach/dashboard'],
            {
              queryParams: {
                section: 'assignments',
                programId: this.programId
              }
            }
          );

        },

        error: (err: unknown) => {

          console.error(
            'Program hozzárendelése sikertelen:',
            err
          );

        }

      });
  }


  // ==========================================================
  // WORKOUTOK BETÖLTÉSE
  // ==========================================================

  loadWorkouts(): void {

    this.loadingWorkouts = true;

    this.exerciseService
      .getWorkoutsWithExercises()
      .subscribe({

        next: (workouts: WorkoutDto[]) => {

          this.workouts = workouts || [];

          this.loadingWorkouts = false;

          console.log(
            'Coach workouts:',
            this.workouts
          );

          // Ha már van program ID,
          // töltsük be a hozzá tartozó workoutokat is.
          if (this.programId !== null) {

            this.loadProgramWorkouts();

          }

        },

        error: (error: any) => {

          console.error(
            'Hiba a workoutok betöltésekor:',
            error
          );

          this.loadingWorkouts = false;

        }

      });
  }


  // ==========================================================
  // EXERCISE-EK BETÖLTÉSE
  // ==========================================================

  loadExercises(): void {

    this.loadingExercises = true;

    this.exerciseService
      .getAllExercises()
      .subscribe({

        next: (exercises: Exercise[]) => {

          this.exercises = exercises || [];

          this.loadingExercises = false;

          console.log(
            'Coach exercise-ok betöltve:',
            this.exercises
          );

        },

        error: (err: any) => {

          console.error(
            'Hiba az exercise-ok betöltésekor:',
            err
          );

          this.exercises = [];

          this.loadingExercises = false;

        }

      });
  }


  // ==========================================================
  // PROGRAM LÉTREHOZÁSA
  // ==========================================================

  createProgram(): void {

    if (!this.programName.trim()) {
      return;
    }

    if (
      this.durationDays === null ||
      this.durationDays <= 0
    ) {
      return;
    }

    if (!this.difficultyLevel) {
      return;
    }

    this.creatingProgram = true;

    const request: ProgramCreationRequest = {

      programName:
        this.programName.trim(),

      programDescription:
        this.programDescription.trim(),

      durationDays:
      this.durationDays,

      difficultyLevel:
      this.difficultyLevel

    };

    console.log(
      'Program létrehozási request:',
      request
    );

    this.coachProgramService
      .createProgram(request)
      .subscribe({

        next: (response: any) => {

          console.log(
            'Program létrehozva:',
            response
          );

          if (
            response.success &&
            response.programId !== null
          ) {

            this.programId =
              response.programId;

            console.log(
              'Létrehozott program ID:',
              this.programId
            );

            // A program létrejött,
            // betöltjük a programhoz tartozó workoutokat.
            this.loadProgramWorkouts();

            this.currentStep = 2;

          } else {

            console.error(
              'A program létrehozása sikertelen:',
              response.message
            );

          }

          this.creatingProgram = false;

        },

        error: (error: any) => {

          console.error(
            'Hiba a program létrehozásakor:',
            error
          );

          this.creatingProgram = false;

        }

      });
  }


  // ==========================================================
  // PROGRAM MÓDOSÍTÁSA
  // ==========================================================

  updateProgram(): void {

    if (this.programId === null) {

      console.error(
        'Nincs program ID.'
      );

      return;
    }

    if (!this.programName.trim()) {
      return;
    }

    if (
      this.durationDays === null ||
      this.durationDays <= 0
    ) {
      return;
    }

    if (!this.difficultyLevel) {
      return;
    }

    this.creatingProgram = true;

    const request: ProgramCreationRequest = {

      programName:
        this.programName.trim(),

      programDescription:
        this.programDescription.trim(),

      durationDays:
      this.durationDays,

      difficultyLevel:
      this.difficultyLevel

    };

    console.log(
      'Program módosítási request:',
      request
    );

    this.coachProgramService
      .updateProgram(
        this.programId,
        request
      )
      .subscribe({

        next: (response) => {

          console.log(
            'Program módosítva:',
            response
          );

          if (response.success) {

            console.log(
              'Program sikeresen módosítva:',
              this.programId
            );

            this.creatingProgram = false;

            this.currentStep = 2;

            this.loadProgramWorkouts();

          } else {

            console.error(
              'A program módosítása sikertelen:',
              response.message
            );

            this.creatingProgram = false;

          }

        },

        error: (error: any) => {

          console.error(
            'Hiba a program módosításakor:',
            error
          );

          this.creatingProgram = false;

        }

      });
  }


  // ==========================================================
  // PROGRAMHOZ TARTOZÓ WORKOUTOK BETÖLTÉSE
  // ==========================================================

  loadProgramWorkouts(): void {

    if (this.programId === null) {

      console.error(
        'Nincs program ID.'
      );

      return;
    }

    this.programWorkoutService
      .getWorkoutsForProgram(this.programId)
      .subscribe({

        next: (response: any) => {

          console.log(
            'Program workout kapcsolatok:',
            response
          );

          /**
           * A backend jelenleg közvetlenül egy tömböt
           * ad vissza.
           *
           * Ha esetleg később data mezőbe kerülne
           * a válasz, azt is kezeljük.
           */
          const data: ProgramWorkout[] =
            Array.isArray(response)
              ? response
              : Array.isArray(response?.data)
                ? response.data
                : [];

          this.programWorkouts =
            [...data].sort(
              (a: ProgramWorkout, b: ProgramWorkout) =>
                a.dayIndex - b.dayIndex
            );

          /**
           * A selectedWorkouts továbbra is WorkoutDto[].
           *
           * A workoutId alapján megkeressük
           * a teljes workout objektumot.
           */
          this.selectedWorkouts =
            this.programWorkouts
              .map(programWorkout =>
                this.workouts.find(
                  workout =>
                    workout.id ===
                    programWorkout.workoutId
                )
              )
              .filter(
                (workout): workout is WorkoutDto =>
                  workout !== undefined
              );

          console.log(
            'Programhoz betöltött workoutok:',
            this.selectedWorkouts
          );

          console.log(
            'Program workout kapcsolatok:',
            this.programWorkouts
          );

          /**
           * Ha a Program Builder egy újonnan létrehozott
           * workouthoz tért vissza, azt automatikusan
           * kiválasztjuk.
           */
          const newWorkoutId =
            this.route.snapshot.queryParamMap.get(
              'newWorkoutId'
            );

          if (newWorkoutId) {

            const workoutId =
              Number(newWorkoutId);

            if (
              !Number.isNaN(workoutId) &&
              workoutId > 0
            ) {

              const newWorkout =
                this.workouts.find(
                  workout =>
                    workout.id === workoutId
                );

              if (newWorkout) {

                console.log(
                  'Új workout automatikusan kiválasztva:',
                  newWorkout
                );

                this.isNewWorkout = true;

                this.selectWorkout(
                  newWorkout.id
                );

              } else {

                console.warn(
                  'Az új workout még nem található a betöltött workout listában:',
                  workoutId
                );

              }
            }
          }

        },

        error: (error: any) => {

          console.error(
            'Hiba a program workoutjainak betöltésekor:',
            error
          );

          this.programWorkouts = [];

          this.selectedWorkouts = [];

        }

      });
  }


  // ==========================================================
  // WORKOUT KIVÁLASZTÁSA
  // ==========================================================

  selectWorkout(workoutId: number): void {

    if (!workoutId) {
      return;
    }

    /*
     * Ha ugyanarra a már megnyitott workoutra kattintunk,
     * akkor csukjuk vissza.
     */
    if (this.selectedWorkoutId === workoutId) {

      this.selectedWorkoutId = null;
      this.selectedWorkout = null;

      this.selectedWorkoutExercises = [];
      this.selectedExercises = [];

      this.loadingExercises = false;

      this.isNewWorkout = false;

      return;
    }


    /*
     * Másik workout kiválasztása.
     */
    this.selectedWorkoutId = workoutId;

    this.selectedWorkout = null;

    this.loadingExercises = true;

    /**
     * Alaphelyzet.
     */
    this.selectedWorkoutExercises = [];
    this.selectedExercises = [];


    /**
     * Meghatározzuk, hogy ez az újonnan létrehozott
     * workout-e.
     *
     * A query paraméter csak az új workout visszatérésének
     * pillanatában van jelen.
     */
    const newWorkoutId =
      this.route.snapshot.queryParamMap.get(
        'newWorkoutId'
      );

    this.isNewWorkout =
      newWorkoutId !== null &&
      Number(newWorkoutId) === workoutId;


    this.exerciseService
      .getWorkoutExercises(workoutId)
      .subscribe({

        next: (workout: WorkoutDto) => {

          this.selectedWorkout = workout;

          /**
           * A workoutban már meglévő
           * WorkoutExercise objektumok.
           */
          this.selectedWorkoutExercises =
            workout.exercises || [];

          /**
           * A board számára csak az Exercise
           * objektumokat adjuk át.
           *
           * Ezek automatikusan kijelölve
           * fognak megjelenni.
           */
          this.selectedExercises =
            this.selectedWorkoutExercises
              .map(
                workoutExercise =>
                  workoutExercise.exercise
              )
              .filter(
                (exercise): exercise is Exercise =>
                  exercise != null
              );

          this.loadingExercises = false;

          console.log(
            'Kiválasztott workout:',
            workout
          );

          console.log(
            'Már meglévő WorkoutExercise-ek:',
            this.selectedWorkoutExercises
          );

          console.log(
            'Már meglévő Exercise-ek:',
            this.selectedExercises
          );

          console.log(
            'Workout típusa:',
            this.isNewWorkout
              ? 'ÚJ WORKOUT - SZERKESZTHETŐ'
              : 'MEGLÉVŐ WORKOUT - LOCKOLT'
          );

        },

        error: (error: any) => {

          console.error(
            'Hiba a workout exercise-ok betöltésekor:',
            error
          );

          this.selectedWorkoutExercises = [];
          this.selectedExercises = [];

          this.loadingExercises = false;

        }

      });
  }


  // ==========================================================
  // EXERCISE-EK SZERKESZTHETŐSÉGE
  // ==========================================================

  /**
   * A CoachExercisesBoardComponent ezt az értéket kapja.
   *
   * true:
   *   meglévő workout → exercise-ek lockolva.
   *
   * false:
   *   új workout → exercise-ek szabadon módosíthatók.
   */
  get lockSelectedExercises(): boolean {
    return !this.isNewWorkout;
  }


  // ==========================================================
  // KIVÁLASZTOTT EXERCISE-OK
  // ==========================================================

  onExercisesChange(
    updatedExercises: Exercise[]
  ): void {

    /**
     * Meglévő workout esetén nem engedünk
     * frontend oldali módosítást sem.
     *
     * A meglévő workout exercise listája fix.
     */
    if (!this.isNewWorkout) {

      console.log(
        'Meglévő workout exercise-listája LOCKOLVA van.'
      );

      return;
    }

    /**
     * Új workout esetén szabadon módosítható.
     */
    this.selectedExercises =
      [...updatedExercises];

    console.log(
      'Kiválasztott exercise-ok:',
      this.selectedExercises
    );
  }


  // ==========================================================
  // ÚJ EXERCISE-EK MEGHATÁROZÁSA
  // ==========================================================

  /**
   * Csak azokat az exercise-eket adja vissza,
   * amelyek még nincsenek benne a workoutban.
   */
  getNewExercisesForWorkout(): Exercise[] {

    const existingExerciseIds =
      this.selectedWorkoutExercises
        .map(workoutExercise =>
          workoutExercise.exercise?.id
        )
        .filter(
          (id): id is number =>
            id != null
        );

    return this.selectedExercises.filter(
      exercise =>
        exercise.id != null &&
        !existingExerciseIds.includes(
          exercise.id
        )
    );
  }


  // ==========================================================
  // EXERCISE-EK MENTÉSE AZ AKTUÁLIS WORKOUT-HOZ
  // ==========================================================

  saveSelectedExercises(): void {

    if (this.selectedWorkoutId === null) {

      console.error(
        'Nincs kiválasztott workout.'
      );

      return;
    }

    /**
     * FONTOS:
     *
     * Meglévő workoutot SOHA nem módosítunk.
     *
     * Egy meglévő workout több programban is szerepelhet.
     * Ezért annak exercise-listája fix.
     */
    if (!this.isNewWorkout) {

      console.log(
        'Meglévő workout. Exercise-ek mentése kihagyva.'
      );

      return;
    }


    const newExercises =
      this.getNewExercisesForWorkout();


    if (newExercises.length === 0) {

      console.log(
        'Nincs új exercise, amit menteni kell.'
      );

      return;
    }


    console.log(
      'Új exercise-ek mentése:',
      newExercises
    );


    for (const exercise of newExercises) {

      if (exercise.id == null) {
        continue;
      }


      this.workoutExerciseService
        .assignExerciseToWorkout(
          this.selectedWorkoutId,
          exercise.id
        )
        .subscribe({

          next: (response: any) => {

            console.log(
              'Exercise sikeresen hozzáadva az új workouthoz:',
              {
                workoutId:
                this.selectedWorkoutId,

                exerciseId:
                exercise.id,

                response
              }
            );


            /**
             * Frontend állapot frissítése.
             */
            const alreadyExists =
              this.selectedWorkoutExercises.some(
                workoutExercise =>
                  workoutExercise.exercise?.id ===
                  exercise.id
              );


            if (!alreadyExists) {

              this.selectedWorkoutExercises.push({

                id:
                  Number(response) || 0,

                workoutId:
                  this.selectedWorkoutId!,

                exercise,

                sets: 0,

                repetitions: 0,

                orderIndex:
                this.selectedWorkoutExercises.length,

                restSeconds: 0,

                done: false

              });

            }

          },

          error: (error: any) => {

            console.error(
              'Hiba az exercise új workouthoz adásakor:',
              error
            );

          }

        });

    }

  }


  // ==========================================================
  // WORKOUT MÁR KIVÁLASZTVA?
  // ==========================================================

  isWorkoutSelected(
    workoutId: number
  ): boolean {

    return this.selectedWorkouts.some(
      workout =>
        workout.id === workoutId
    );
  }


  // ==========================================================
  // WORKOUT HOZZÁADÁSA
  // ==========================================================

  addSelectedWorkout(): void {

    if (!this.selectedWorkout) {
      return;
    }

    if (this.programId === null) {

      console.error(
        'Nincs program ID.'
      );

      return;
    }


    if (
      this.isWorkoutSelected(
        this.selectedWorkout.id
      )
    ) {

      return;
    }


    const workout =
      this.selectedWorkout;


    /**
     * A következő dayIndex.
     *
     * 0 = első workout
     * 1 = második workout
     * stb.
     */
    const dayIndex =
      this.selectedWorkouts.length;


    this.programWorkoutService
      .addWorkoutToProgram(
        this.programId,
        workout.id,
        dayIndex
      )
      .subscribe({

        next: (response: any) => {

          console.log(
            'Workout hozzáadva a programhoz:',
            response
          );


          /**
           * Frontend lista frissítése.
           */
          this.selectedWorkouts.push(
            workout
          );


          /**
           * Új program-workout kapcsolat
           * létrehozása a frontend állapotban.
           */
          this.programWorkouts.push({

            id:
            response?.id,

            programId:
              this.programId!,

            workoutId:
            workout.id,

            dayIndex

          });


          console.log(
            'Program workoutok:',
            this.programWorkouts
          );


          /**
           * FONTOS:
           *
           * Csak új workout esetén mentjük
           * az exercise-eket.
           *
           * Meglévő workout esetén semmilyen
           * workout_exercises módosítás nem történik.
           */
          if (this.isNewWorkout) {

            this.saveSelectedExercises();

          } else {

            console.log(
              'Meglévő workout hozzáadva. ' +
              'WorkoutExercise-ek nem módosulnak.'
            );

          }

        },

        error: (error: any) => {

          console.error(
            'Hiba a workout programhoz adásakor:',
            error
          );

        }

      });

  }


  // ==========================================================
  // WORKOUT ELTÁVOLÍTÁSA
  // ==========================================================

  removeWorkout(workoutId: number): void {

    if (this.programId === null) {

      console.error(
        'Nincs program ID.'
      );

      return;
    }


    this.programWorkoutService
      .deleteProgramWorkout(
        this.programId,
        workoutId
      )
      .subscribe({

        next: (response: any) => {

          console.log(
            'Workout törölve a programból:',
            response
          );


          /**
           * FONTOS:
           *
           * Csak a program-workout kapcsolatot töröljük.
           *
           * A workout saját exercise-eihez
           * NEM nyúlunk.
           *
           * Ez azért fontos, mert ugyanaz a workout
           * másik programban is szerepelhet.
           */
          this.selectedWorkouts =
            this.selectedWorkouts.filter(
              workout =>
                workout.id !== workoutId
            );


          /**
           * ProgramWorkout kapcsolat törlése
           * a frontend állapotból is.
           */
          this.programWorkouts =
            this.programWorkouts.filter(
              programWorkout =>
                programWorkout.workoutId !== workoutId
            );


          /**
           * Ha ezt a workoutot néztük,
           * zárjuk be a részleteit.
           */
          if (
            this.selectedWorkoutId ===
            workoutId
          ) {

            this.selectedWorkoutId = null;

            this.selectedWorkout = null;

            this.selectedWorkoutExercises = [];

            this.selectedExercises = [];

            this.isNewWorkout = false;

          }


          /**
           * A törlés után újraszámoljuk
           * a dayIndex értékeket.
           */
          this.reindexProgramWorkouts();

        },

        error: (error: any) => {

          console.error(
            'Hiba a workout programból törlésekor:',
            error
          );

        }

      });

  }


  // ==========================================================
  // DAY INDEX ÚJRASZÁMOZÁSA
  // ==========================================================

  reindexProgramWorkouts(): void {

    if (this.programId === null) {
      return;
    }

    this.programWorkouts =
      this.programWorkouts.map(
        (programWorkout, index) => ({

          ...programWorkout,

          dayIndex:
          index

        })
      );


    console.log(
      'Új dayIndex-ek:',
      this.programWorkouts
    );

  }


  // ==========================================================
  // WORKOUT NAPJÁNAK MÓDOSÍTÁSA
  // ==========================================================

  updateWorkoutDay(
    workoutId: number,
    dayIndex: number
  ): void {

    const programWorkout =
      this.programWorkouts.find(
        pw =>
          pw.workoutId === workoutId
      );


    if (!programWorkout) {

      console.error(
        'Nem található program-workout kapcsolat.'
      );

      return;
    }


    if (programWorkout.id === undefined) {

      console.error(
        'A program-workout kapcsolatnak nincs ID-ja.'
      );

      return;
    }


    this.programWorkoutService
      .updateProgramWorkout(
        programWorkout.id,
        dayIndex
      )
      .subscribe({

        next: (response: any) => {

          console.log(
            'Workout napja módosítva:',
            response
          );


          programWorkout.dayIndex =
            dayIndex;


          this.programWorkouts =
            [...this.programWorkouts].sort(
              (a, b) =>
                a.dayIndex - b.dayIndex
            );


          this.selectedWorkouts =
            this.programWorkouts
              .map(pw =>
                this.workouts.find(
                  workout =>
                    workout.id ===
                    pw.workoutId
                )
              )
              .filter(
                (workout): workout is WorkoutDto =>
                  workout !== undefined
              );

        },

        error: (error: any) => {

          console.error(
            'Hiba a workout napjának módosításakor:',
            error
          );

        }

      });

  }


  // ==========================================================
  // WORKOUT DAY INDEX LEKÉRÉSE
  // ==========================================================

  getWorkoutDayIndex(
    workoutId: number
  ): number {

    const programWorkout =
      this.programWorkouts.find(
        pw =>
          pw.workoutId === workoutId
      );

    return programWorkout?.dayIndex ?? 0;

  }


  // ==========================================================
  // KÖVETKEZŐ LÉPÉS
  // ==========================================================

  nextStep(): void {

    if (this.currentStep === 1) {

      if (this.programId === null) {

        // Új program → INSERT
        this.createProgram();

      } else {

        // Meglévő program → UPDATE
        this.updateProgram();

      }

      return;
    }

    if (this.currentStep < 2) {

      this.currentStep++;

    }

  }


  // ==========================================================
  // ELŐZŐ LÉPÉS
  // ==========================================================
  previousStep(): void {

    // Meglévő program szerkesztésekor
    // a 2. lépésből visszamegyünk a Programok listájára.
    if (
      this.currentStep === 2 &&
      this.programId !== null
    ) {
      this.router.navigate(
        ['/coach/dashboard'],
        {
          queryParams: {
            section: 'programs'
          }
        }
      );

      return;
    }

    // Új program esetén marad a normál
    // 2. lépés -> 1. lépés visszalépés.
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

}
