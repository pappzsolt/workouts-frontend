import {
  Component,
  OnInit,
  OnChanges,
  SimpleChanges,
  Input,
  Output,
  EventEmitter,
  inject
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ExerciseService } from
    '../../../../services/coach/coach-exercises/coach-exercises.service';

import { Exercise } from '../../../../models/exercise.model';


@Component({
  selector: 'app-coach-exercises-board',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  styleUrl: './coach-exercises-board.component.css',
  templateUrl: './coach-exercises-board.component.html'
})
export class CoachExercisesBoardComponent
  implements OnInit, OnChanges {

  private exerciseService = inject(ExerciseService);


  // ==========================================================
  // INPUT / OUTPUT
  // ==========================================================

  @Input()
  externalExercises: Exercise[] = [];

  @Input()
  externalSelectedExercises: Exercise[] = [];

  /**
   * Exercise-ek zárolása.
   *
   * true:
   *   meglévő workout → az exercise-ek nem módosíthatók.
   *
   * false:
   *   új workout → az exercise-ek szabadon
   *   kiválaszthatók és eltávolíthatók.
   */
  @Input()
  lockSelectedExercises = false;

  @Output()
  exercisesChange =
    new EventEmitter<Exercise[]>();


  // ==========================================================
  // ÁLLAPOT
  // ==========================================================

  exercises: Exercise[] = [];

  selectedExercises: Exercise[] = [];

  loading = false;

  message = '';


  // ==========================================================
  // LAPOZÁS
  // ==========================================================

  exercisePage = 1;

  pageSize = 5;


  // ==========================================================
  // INIT
  // ==========================================================

  ngOnInit(): void {

    this.loadExercises();

  }


  // ==========================================================
  // INPUT VÁLTOZÁSOK
  // ==========================================================

  ngOnChanges(
    changes: SimpleChanges
  ): void {

    /**
     * Ha a szülő selectedExercises tömbje változik
     * (például workout kiválasztásakor vagy resetnél),
     * tükrözzük a változást.
     */
    if (
      changes['externalSelectedExercises']
    ) {

      if (
        this.externalSelectedExercises?.length
      ) {

        this.selectedExercises =
          [...this.externalSelectedExercises];

      } else {

        this.selectedExercises = [];

      }

    }


    /**
     * Ha a szülő exercise listát ad át,
     * azt használjuk.
     */
    if (
      changes['externalExercises'] &&
      this.externalExercises
    ) {

      this.exercises =
        [...this.externalExercises];

      this.exercisePage = 1;

      /**
       * A szülőnek visszaküldjük az aktuális
       * kiválasztott exercise-eket.
       */
      this.exercisesChange.emit(
        [...this.selectedExercises]
      );

    }

  }


  // ==========================================================
  // EXERCISE-EK BETÖLTÉSE
  // ==========================================================

  loadExercises(): void {

    this.loading = true;

    this.exerciseService
      .getAllExercises()
      .subscribe({

        next: (res: Exercise[]) => {

          this.loading = false;

          this.exercises =
            res || [];

          this.exercisePage = 1;

          if (
            !this.exercises.length
          ) {

            this.message =
              'Nincsenek elérhető exercise-ek.';

          } else {

            this.message = '';

          }

        },

        error: (err) => {

          this.loading = false;

          this.message =
            'Hiba az exercise-ek betöltése során';

          console.error(
            '❌ Exercise-ek betöltése sikertelen',
            err
          );

        }

      });

  }


  // ==========================================================
  // LAPOZÁS
  // ==========================================================

  get pagedExercises(): Exercise[] {

    const start =
      (this.exercisePage - 1) *
      this.pageSize;

    return this.exercises.slice(
      start,
      start + this.pageSize
    );

  }


  get totalExercisePages(): number {

    return Math.ceil(
      this.exercises.length /
      this.pageSize
    );

  }


  nextExercisePage(): void {

    if (
      this.exercisePage <
      this.totalExercisePages
    ) {

      this.exercisePage++;

    }

  }


  prevExercisePage(): void {

    if (
      this.exercisePage > 1
    ) {

      this.exercisePage--;

    }

  }


  // ==========================================================
  // EXERCISE KIVÁLASZTÁS
  // ==========================================================

  isExerciseSelected(
    ex: Exercise
  ): boolean {

    return !!this.selectedExercises.find(
      exercise =>
        exercise.id === ex.id
    );

  }


  // ==========================================================
  // EXERCISE KIVÁLASZTÁS MÓDOSÍTÁSA
  // ==========================================================

  toggleExerciseSelection(
    ex: Exercise,
    checked: boolean
  ): void {

    /**
     * Meglévő workout esetén az exercise lista
     * teljesen zárolva van.
     *
     * Ez egy második védelmi szint:
     * még akkor sem módosítjuk az állapotot,
     * ha valamilyen módon meghívódna ez a metódus.
     */
    if (this.lockSelectedExercises) {

      console.log(
        'Az exercise lista zárolva van. ' +
        'A meglévő workout nem módosítható.'
      );

      return;

    }


    // ----------------------------------------------------------
    // ÚJ WORKOUT
    // ----------------------------------------------------------

    if (checked) {

      if (
        !this.selectedExercises.find(
          exercise =>
            exercise.id === ex.id
        )
      ) {

        this.selectedExercises.push(ex);

      }

    } else {

      this.selectedExercises =
        this.selectedExercises.filter(
          exercise =>
            exercise.id !== ex.id
        );

    }


    /**
     * Csak új workout esetén jutunk ide,
     * ezért itt biztonságosan jelezhetjük
     * a szülőnek a változást.
     */
    this.exercisesChange.emit(
      [...this.selectedExercises]
    );

  }


  // ==========================================================
  // CHECKBOX CHANGE
  // ==========================================================

  onCheckboxChange(
    ex: Exercise,
    event: Event
  ): void {

    /**
     * Meglévő workout esetén nincs módosítás.
     */
    if (this.lockSelectedExercises) {

      return;

    }


    const target =
      event.target as HTMLInputElement;

    this.toggleExerciseSelection(
      ex,
      target.checked
    );

  }

}
