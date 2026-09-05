import {
  Component,
  OnInit,
  Input,
  OnChanges,
  SimpleChanges
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { CoachWorkoutsService } from '../../../../services/coach/coach-workouts/coach-workouts.service';

import { Workout } from '../../../../models/workout.model';

import { USER_MESSAGES } from '../../../../constants/user-messages';

import { NewWorkoutComponent } from '../../operations/coach-workouts/coach-workout-new/new-workout.component';


@Component({
  selector: 'app-coach-workouts',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NewWorkoutComponent
  ],
  templateUrl: './coach-workouts.component.html',
  styleUrls: ['./coach-workouts.component.css']
})
export class WorkoutListComponent
  implements OnInit, OnChanges {

  // ==========================================================
  // WORKOUTOK
  // ==========================================================

  workouts: Workout[] = [];


  // ==========================================================
  // ÚJ WORKOUT
  // ==========================================================

  newWorkout: Workout = {
    workoutName: '',
    description: '',
    durationMinutes: 0
  };


  // ==========================================================
  // INPUT
  // ==========================================================

  @Input()
  programId?: number;

  @Input()
  userId: number = 1;


  // ==========================================================
  // ÜZENETEK
  // ==========================================================

  message: string = '';

  messageType:
    'success' |
    'error' |
    '' = '';


  // ==========================================================
  // ÚJ WORKOUT FORM
  // ==========================================================

  showNewWorkoutForm: boolean = false;


  // ==========================================================
  // LAPOZÁS
  // ==========================================================

  currentPage: number = 1;

  itemsPerPage: number = 4;

  totalPages: number = 1;


  // ==========================================================
  // KERESÉS
  // ==========================================================

  searchTerm: string = '';


  // ==========================================================
  // RENDEZÉS
  // ==========================================================

  sortDirection:
    'asc' |
    'desc' = 'asc';


  constructor(
    private coachWorkoutsService: CoachWorkoutsService,
    private router: Router
  ) {}


  // ==========================================================
  // INIT
  // ==========================================================

  ngOnInit(): void {

    this.loadWorkouts();

  }


  // ==========================================================
  // INPUT VÁLTOZÁS
  // ==========================================================

  ngOnChanges(
    changes: SimpleChanges
  ): void {

    if (
      changes['programId'] &&
      !changes['programId'].firstChange
    ) {

      this.loadWorkouts();

    }

  }


  // ==========================================================
  // WORKOUTOK BETÖLTÉSE
  // ==========================================================

  loadWorkouts(): void {

    console.log(
      '[CoachWorkouts] loadWorkouts()'
    );


    this.coachWorkoutsService
      .getMyWorkouts()
      .subscribe({

        next: (res: Workout[]) => {

          console.log(
            '[CoachWorkouts] response:',
            res
          );


          this.workouts =
            (res ?? []).map(
              (w: Workout): Workout => ({

                id:
                w.id,

                workoutName:
                  w.workoutName ??
                  w.name ??
                  '',

                description:
                  w.description ??
                  w.workoutDescription ??
                  '',

                durationMinutes:
                w.durationMinutes,

                difficultyLevel:
                w.difficultyLevel,

                exercises:
                  w.exercises ?? []

              })
            );


          // Mindig az első oldalról indulunk.

          this.currentPage = 1;

          this.updatePagination();


          console.log(
            '[CoachWorkouts] betöltött workoutok:',
            this.workouts
          );

        },


        error: (error) => {

          console.error(
            '[CoachWorkouts] workout betöltési hiba:',
            error
          );


          this.workouts = [];

          this.currentPage = 1;

          this.totalPages = 1;


          this.setMessage(
            'Nem sikerült betölteni a workoutokat.',
            'error'
          );

        }

      });

  }


  // ==========================================================
  // SZŰRT ÉS RENDEZETT WORKOUTOK
  // ==========================================================

  get filteredWorkouts(): Workout[] {

    const search =
      this.searchTerm
        .trim()
        .toLowerCase();


    const result =
      this.workouts.filter(
        (workout: Workout): boolean => {

          const workoutName =
            workout.workoutName
              ?.toLowerCase() ?? '';


          return workoutName.includes(
            search
          );

        }
      );


    // ========================================================
    // RENDEZÉS WORKOUT NÉV SZERINT
    // ========================================================

    result.sort(
      (
        a: Workout,
        b: Workout
      ): number => {

        const nameA =
          a.workoutName
            ?.trim()
            .toLowerCase() ?? '';


        const nameB =
          b.workoutName
            ?.trim()
            .toLowerCase() ?? '';


        const comparison =
          nameA.localeCompare(
            nameB,
            'hu',
            {
              sensitivity: 'base'
            }
          );


        return this.sortDirection === 'asc'
          ? comparison
          : -comparison;

      }
    );


    return result;

  }


  // ==========================================================
  // LAPOZÁS FRISSÍTÉSE
  // ==========================================================

  private updatePagination(): void {

    const workoutCount =
      this.filteredWorkouts.length;


    this.totalPages =
      Math.max(
        1,
        Math.ceil(
          workoutCount /
          this.itemsPerPage
        )
      );


    if (
      this.currentPage >
      this.totalPages
    ) {

      this.currentPage =
        this.totalPages;

    }

  }


  // ==========================================================
  // KERESÉS VÁLTOZÁSA
  // ==========================================================

  onSearchChange(): void {

    // Új keresésnél
    // mindig az első oldalra megyünk.

    this.currentPage = 1;

    this.updatePagination();

  }


  // ==========================================================
  // RENDEZÉS VÁLTOZTATÁSA
  // ==========================================================

  toggleSort(): void {

    this.sortDirection =
      this.sortDirection === 'asc'
        ? 'desc'
        : 'asc';


    // Rendezés után is
    // az első oldalra megyünk.

    this.currentPage = 1;

    this.updatePagination();

  }


  // ==========================================================
  // AKTUÁLIS OLDAL WORKOUTJAI
  // ==========================================================

  get pagedWorkouts(): Workout[] {

    const startIndex =
      (
        this.currentPage - 1
      ) *
      this.itemsPerPage;


    return this.filteredWorkouts.slice(
      startIndex,
      startIndex +
      this.itemsPerPage
    );

  }


  // ==========================================================
  // KÖVETKEZŐ OLDAL
  // ==========================================================

  nextPage(): void {

    if (
      this.currentPage <
      this.totalPages
    ) {

      this.currentPage++;

    }

  }


  // ==========================================================
  // ELŐZŐ OLDAL
  // ==========================================================

  prevPage(): void {

    if (
      this.currentPage >
      1
    ) {

      this.currentPage--;

    }

  }


  // ==========================================================
  // WORKOUT HOZZÁADÁSA
  // ==========================================================

  addWorkout(): void {

    if (
      this.programId === undefined ||
      this.programId === null
    ) {

      return;

    }


    this.newWorkout.programId =
      this.programId;


    this.coachWorkoutsService
      .addWorkout(
        this.newWorkout
      )
      .subscribe({

        next: (res) => {

          if (
            res.status === 'ok'
          ) {

            this.setMessage(
              res.message,
              'success'
            );


            this.newWorkout = {
              workoutName: '',
              description: '',
              durationMinutes: 0
            };


            this.loadWorkouts();

          } else {

            this.setMessage(
              res.message,
              'error'
            );

          }

        },


        error: () => {

          this.setMessage(
            'Hiba történt a workout hozzáadásakor.',
            'error'
          );

        }

      });

  }


  // ==========================================================
  // WORKOUT SZERKESZTÉSE
  // ==========================================================

  editWorkout(
    workoutId: number | undefined,
    event: MouseEvent
  ): void {

    event.stopPropagation();


    if (
      workoutId === undefined ||
      workoutId === null ||
      workoutId <= 0
    ) {

      this.message =
        USER_MESSAGES.workoutClickError;

      return;

    }


    this.router
      .navigate([
        `/coach/workouts/${workoutId}/edit`
      ])
      .catch(
        (error) => {

          console.error(
            'router.navigate hiba:',
            error
          );


          this.message =
            USER_MESSAGES.workoutClickError;

        }
      );

  }


  // ==========================================================
  // ÚJ WORKOUT FORM KI/BE
  // ==========================================================

  toggleNewWorkout(): void {

    this.showNewWorkoutForm =
      !this.showNewWorkoutForm;

  }


  // ==========================================================
  // ÜZENET
  // ==========================================================

  private setMessage(
    msg: string,
    type:
      'success' |
      'error'
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


  // ==========================================================
  // ÚJ WORKOUT OLDAL
  // ==========================================================

  goToNewWorkout(): void {

    this.router.navigate([
      '/coach/workouts/new'
    ]);

  }

}
