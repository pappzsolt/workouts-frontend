import {
  Component,
  OnInit
} from '@angular/core';

import {
  CommonModule
} from '@angular/common';

import {
  FormsModule
} from '@angular/forms';

import {
  Router,
  ActivatedRoute
} from '@angular/router';

import {
  Exercise
} from '../../../../models/exercise.model';

import {
  ExerciseService
} from '../../../../services/coach/coach-exercises/coach-exercises.service';


@Component({
  selector: 'app-exercise-controller',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './coach-exercises.component.html',
  styleUrls: ['./coach-exercises.component.css']
})
export class ExerciseControllerComponent
  implements OnInit {


  // ==========================================================
  // GYAKORLATOK
  // ==========================================================

  exercises: Exercise[] = [];


  // ==========================================================
  // BETÖLTÉS
  // ==========================================================

  loading = false;


  // ==========================================================
  // LAPOZÁS
  // ==========================================================

  currentPage = 1;

  itemsPerPage = 4;

  totalPages = 1;


  // ==========================================================
  // KERESÉS
  // ==========================================================

  searchTerm = '';


  // ==========================================================
  // RENDEZÉS
  // ==========================================================

  sortDirection:
    'asc' |
    'desc' = 'asc';


  constructor(
    private exerciseService: ExerciseService,
    private router: Router,
    private route: ActivatedRoute
  ) {}


  // ==========================================================
  // INIT
  // ==========================================================

  ngOnInit(): void {

    this.loadExercises();

  }


  // ==========================================================
  // GYAKORLATOK BETÖLTÉSE
  // ==========================================================

  loadExercises(): void {

    this.loading = true;


    this.exerciseService
      .getAllExercises()
      .subscribe({

        next: (exercises: Exercise[]) => {

          this.exercises =
            exercises ?? [];


          // Betöltés után
          // mindig az első oldalról indulunk.

          this.currentPage = 1;

          this.updatePagination();


          this.loading = false;

        },


        error: (error) => {

          console.error(
            'Hiba a gyakorlatok betöltésekor:',
            error
          );


          this.exercises = [];

          this.currentPage = 1;

          this.totalPages = 1;

          this.loading = false;

        }

      });

  }


  // ==========================================================
  // SZŰRT ÉS RENDEZETT GYAKORLATOK
  // ==========================================================

  get filteredExercises(): Exercise[] {

    const search =
      this.searchTerm
        .trim()
        .toLowerCase();


    const result =
      this.exercises.filter(
        (exercise: Exercise): boolean => {

          const exerciseName =
            exercise.name
              ?.trim()
              .toLowerCase() ?? '';


          return exerciseName.includes(
            search
          );

        }
      );


    // ========================================================
    // RENDEZÉS GYAKORLAT NÉV SZERINT
    // ========================================================

    result.sort(
      (
        a: Exercise,
        b: Exercise
      ): number => {

        const nameA =
          a.name
            ?.trim()
            .toLowerCase() ?? '';


        const nameB =
          b.name
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

    const exerciseCount =
      this.filteredExercises.length;


    this.totalPages =
      Math.max(
        1,
        Math.ceil(
          exerciseCount /
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
    // mindig az első oldal.

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


    // Rendezés után
    // mindig az első oldal.

    this.currentPage = 1;

    this.updatePagination();

  }


  // ==========================================================
  // AKTUÁLIS OLDAL GYAKORLATAI
  // ==========================================================

  get pagedExercises(): Exercise[] {

    const startIndex =
      (
        this.currentPage - 1
      ) *
      this.itemsPerPage;


    return this.filteredExercises.slice(
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
  // GYAKORLAT SZERKESZTÉSE
  // ==========================================================

  editExercise(
    exerciseId: number
  ): void {

    this.router.navigate([
      '/coach/exercises',
      exerciseId,
      'edit'
    ]);

  }


  // ==========================================================
  // ÚJ GYAKORLAT
  // ==========================================================

  goToNewExercise(): void {

    this.router.navigate([
      '/coach/exercises/new'
    ]);

  }

}
