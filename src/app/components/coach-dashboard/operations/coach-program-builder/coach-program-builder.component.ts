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
import { AssignProgramService } from '../../../../services/coach/assign-program/assignprogram.service';
import { UserSelectComponent } from '../../../shared/user/user-select.component';

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


  ngOnInit(): void {

    // Exercise-ok betöltése
    this.loadExercises();

    const programId =
      this.route.snapshot.queryParamMap.get('programId');

    if (programId) {

      this.programId = Number(programId);

      console.log(
        'Meglévő program betöltése:',
        this.programId
      );

      // A program már létezik,
      // ezért rögtön a workout lépésre megyünk.
      this.currentStep = 2;

      this.loadWorkouts();

      return;
    }

    // Normál belépés:
    // új program létrehozása.
    this.loadWorkouts();
  }


  // ==========================================================
  // ÚJ WORKOUT LÉTREHOZÁSA
  // ==========================================================

  goToCreateWorkout(): void {

    if (this.programId === null) {
      console.error('Nincs program ID.');
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
      console.error('Nincs program ID.');
      return;
    }

    if (!this.selectedUserId) {
      console.error('Nincs kiválasztott felhasználó.');
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
            workouts
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

    this.exerciseService
      .getAllExercises()
      .subscribe({

        next: (exercises: Exercise[]) => {

          this.exercises = exercises || [];

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
  // PROGRAMHOZ TARTOZÓ WORKOUTOK BETÖLTÉSE
  // ==========================================================

  loadProgramWorkouts(): void {

    if (this.programId === null) {
      console.error('Nincs program ID.');
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
           * Elmentjük a backend kapcsolatokat.
           */
          this.programWorkouts =
            [...response.data].sort(
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
        },

        error: (error: any) => {

          console.error(
            'Hiba a program workoutjainak betöltésekor:',
            error
          );
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

    this.selectedWorkoutId = workoutId;

    this.selectedWorkout = null;

    this.loadingExercises = true;

    /**
     * Alaphelyzet.
     */
    this.selectedWorkoutExercises = [];
    this.selectedExercises = [];

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
  // KIVÁLASZTOTT EXERCISE-OK
  // ==========================================================

  onExercisesChange(
    updatedExercises: Exercise[]
  ): void {

    this.selectedExercises = [...updatedExercises];

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
              'Exercise sikeresen hozzáadva a workouthoz:',
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
             *
             * Az új exercise-t hozzáadjuk
             * a meglévő WorkoutExercise-ekhez.
             *
             * A backend DEFAULT értékeket használ
             * a sets/repetitions/rest/order mezőkhöz,
             * ezért itt csak a kapcsolatot
             * reprezentáljuk.
             */
            const alreadyExists =
              this.selectedWorkoutExercises.some(
                workoutExercise =>
                  workoutExercise.exercise?.id ===
                  exercise.id
              );

            if (!alreadyExists) {

              this.selectedWorkoutExercises.push({
                id: Number(response) || 0,
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
              'Hiba az exercise workouthoz adásakor:',
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
      console.error('Nincs program ID.');
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
           * Új kapcsolat létrehozása
           * a frontend állapotban.
           *
           * Az ID-t a backend válaszból
           * jelenleg nem kapjuk vissza,
           * ezért ezt csak az újonnan létrehozott
           * kapcsolat reprezentációjaként használjuk.
           */
          this.programWorkouts.push({
            programId: this.programId!,
            workoutId: workout.id,
            dayIndex
          });

          console.log(
            'Program workoutok:',
            this.programWorkouts
          );

          /**
           * Ha új workoutot adtunk hozzá,
           * a már meglévő exercise-eket
           * ismerjük a selectedWorkout alapján.
           */
          this.selectedWorkoutExercises =
            workout.exercises || [];

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
      console.error('Nincs program ID.');
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
           * Frontend Workout lista frissítése.
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
          dayIndex: index
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

      this.createProgram();

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

    if (this.currentStep > 1) {

      this.currentStep--;
    }
  }

}
