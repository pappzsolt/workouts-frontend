import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { Subject, takeUntil } from 'rxjs';

import { Exercise } from '../../../../models/exercise.model';

import { ExerciseService } from '../../../../services/coach/coach-exercises/coach-exercises.service';
import { LanguageService } from '../../../../services/shared/language.service';

import { SHARED_IMPORTS } from '../../../shared/shared-imports';

@Component({
  selector: 'app-exercise-controller',
  standalone: true,
  imports: [...SHARED_IMPORTS],
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
  // ==========================================================

  currentPage = 0;

  itemsPerPage = 6;

  totalElements = 0;

  totalPages = 1;

  // ==========================================================
  // KERESÉS
  // ==========================================================

  searchTerm = '';

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
        this.currentPage,
        this.itemsPerPage,
        undefined,
        undefined,
        this.sortDirection,
      )
      .subscribe({
        next: (response) => {
          console.log('[CoachExercises] response:', response);

          const searchResponse = response.data;

          this.exercises = searchResponse?.content ?? [];

          this.totalElements = searchResponse?.totalElements ?? 0;

          this.totalPages = Math.max(1, searchResponse?.totalPages ?? 1);

          this.loading = false;

          console.log('[CoachExercises] betöltött gyakorlatok:', this.exercises);

          console.log('[CoachExercises] totalElements:', this.totalElements);

          console.log('[CoachExercises] totalPages:', this.totalPages);
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
  // KÖVETKEZŐ OLDAL
  // ==========================================================

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;

      this.loadExercises();
    }
  }

  // ==========================================================
  // ELŐZŐ OLDAL
  // ==========================================================

  prevPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;

      this.loadExercises();
    }
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
