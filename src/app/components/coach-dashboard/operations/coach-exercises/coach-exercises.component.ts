import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { Subject, takeUntil } from 'rxjs';

import { AppCardComponent } from '../../../shared/components/app-card/app-card.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';

import { Exercise } from '../../../../models/exercise.model';

import { ExerciseService } from '../../../../services/coach/coach-exercises/coach-exercises.service';
import { LanguageService } from '../../../../services/shared/language.service';

import { SHARED_IMPORTS } from '../../../shared/shared-imports';

import {
  ExerciseSearchFieldComponent,
  SelectOption,
} from '../../../shared/components/exercise-search-field/exercise-search-field.component';

@Component({
  selector: 'app-exercise-controller',
  standalone: true,
  imports: [...SHARED_IMPORTS, ExerciseSearchFieldComponent, AppCardComponent, PaginationComponent],
  templateUrl: './coach-exercises.component.html',
  styleUrls: ['./coach-exercises.component.css'],
})
export class ExerciseControllerComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  // ==========================================================
  // GYAKORLATOK
  // ==========================================================

  exercises: Exercise[] = [];

  // ==========================================================
  // BETÖLTÉS
  // ==========================================================

  loading = false;

  // ==========================================================
  // ÜZENET
  // ==========================================================

  message = '';

  messageType: 'success' | 'error' | 'info' | '' = '';

  // ==========================================================
  // LAPOZÁS
  // A backend 0-alapú oldalszámot használ.
  // ==========================================================

  currentPage = 0;

  itemsPerPage = 6;

  totalElements = 0;

  totalPages = 1;

  // ==========================================================
  // KERESÉS
  // ==========================================================

  searchTerm = '';

  searchField = 'all';

  searchFieldOptions: SelectOption[] = [
    {
      value: 'all',
      label: 'coachExercises.searchFields.all',
    },
    {
      value: 'name',
      label: 'coachExercises.searchFields.name',
    },
    {
      value: 'bodyPart',
      label: 'coachExercises.searchFields.bodyPart',
    },
    {
      value: 'primaryMuscles',
      label: 'coachExercises.searchFields.primaryMuscles',
    },
    {
      value: 'secondaryMuscles',
      label: 'coachExercises.searchFields.secondaryMuscles',
    },
  ];

  // ==========================================================
  // RENDEZÉS
  // ==========================================================

  sortDirection: 'asc' | 'desc' = 'asc';

  constructor(
    private exerciseService: ExerciseService,
    private router: Router,
    private route: ActivatedRoute,
    private languageService: LanguageService,
  ) {}

  // ==========================================================
  // INIT
  // ==========================================================

  ngOnInit(): void {
    this.loadExercises();

    // ==========================================================
    // NYELVVÁLTÁS
    // ==========================================================

    this.languageService.language$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.currentPage = 0;
      this.loadExercises();
    });
  }

  // ==========================================================
  // GYAKORLATOK BETÖLTÉSE
  // ==========================================================

  loadExercises(): void {
    this.loading = true;
    this.clearMessage();

    this.exerciseService
      .searchExercises(
        this.searchTerm,
        this.searchField,
        this.currentPage,
        this.itemsPerPage,
        undefined,
        undefined,
        this.sortDirection,
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const searchResponse = response.data;

          this.exercises = searchResponse?.content ?? [];
          this.totalElements = searchResponse?.totalElements ?? 0;
          this.totalPages = Math.max(1, searchResponse?.totalPages ?? 1);

          this.loading = false;
        },

        error: (error) => {
          console.error('[CoachExercises] Hiba a gyakorlatok betöltésekor:', error);

          this.exercises = [];
          this.totalElements = 0;
          this.currentPage = 0;
          this.totalPages = 1;
          this.loading = false;

          const backendMessage =
            typeof error.error === 'string' ? error.error : error.error?.message;

          this.showError(backendMessage || 'A gyakorlatok betöltése sikertelen.');
        },
      });
  }

  // ==========================================================
  // SZŰRT GYAKORLATOK
  // ==========================================================

  get filteredExercises(): Exercise[] {
    return this.exercises;
  }

  // ==========================================================
  // KERESÉS
  // ==========================================================

  search(): void {
    this.currentPage = 0;
    this.loadExercises();
  }

  // ==========================================================
  // RENDEZÉS VÁLTOZTATÁSA
  // ==========================================================

  toggleSort(): void {
    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';

    this.currentPage = 0;
    this.loadExercises();
  }

  // ==========================================================
  // AKTUÁLIS OLDAL GYAKORLATAI
  // ==========================================================

  get pagedExercises(): Exercise[] {
    return this.exercises;
  }

  // ==========================================================
  // KÖZÖS LAPOZÓ KOMPONENS ESEMÉNYE
  // A PaginationComponent 1-alapú oldalszámot küld.
  // A backend 0-alapú oldalszámot vár.
  // ==========================================================

  onPageChange(page: number): void {
    const newPage = page - 1;

    if (newPage < 0 || newPage >= this.totalPages || newPage === this.currentPage) {
      return;
    }

    this.currentPage = newPage;
    this.loadExercises();
  }

  // ==========================================================
  // GYAKORLAT SZERKESZTÉSE
  // ==========================================================

  editExercise(exerciseId: number): void {
    this.router.navigate(['/coach/exercises', exerciseId, 'edit']);
  }

  // ==========================================================
  // ÚJ GYAKORLAT
  // ==========================================================

  goToNewExercise(): void {
    this.router.navigate(['/coach/exercises/new']);
  }

  // ==========================================================
  // MESSAGE SEGÉDMETÓDUSOK
  // ==========================================================

  private showError(message: string): void {
    this.message = message;
    this.messageType = 'error';
  }

  private clearMessage(): void {
    this.message = '';
    this.messageType = '';
  }

  // ==========================================================
  // DESTROY
  // ==========================================================

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ==========================================================
  // EXERCISE KÉPEK
  // ==========================================================

  getExerciseImages(exercise: Exercise): string[] {
    if (!exercise.imageUrl) {
      return [];
    }

    try {
      const images = JSON.parse(exercise.imageUrl);

      return Array.isArray(images) ? images : [];
    } catch (error) {
      console.error('[CoachExercises] Hibás imageUrl JSON:', exercise.imageUrl, error);

      return [];
    }
  }
}
