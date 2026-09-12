import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { Exercise } from '../../../../models/exercise.model';
import { ExerciseService } from '../../../../services/coach/coach-exercises/coach-exercises.service';

import { SHARED_IMPORTS } from '../../../shared/shared-imports';

@Component({
  selector: 'app-exercise-controller',
  standalone: true,
  imports: [...SHARED_IMPORTS],
  templateUrl: './coach-exercises.component.html',
  styleUrls: ['./coach-exercises.component.css'],
})
export class ExerciseControllerComponent implements OnInit {
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

  sortDirection: 'asc' | 'desc' = 'asc';

  constructor(
    private exerciseService: ExerciseService,
    private router: Router,
    private route: ActivatedRoute,
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

    this.clearMessage();

    this.exerciseService.getAllExercises().subscribe({
      next: (response) => {
        console.log('[CoachExercises] response:', response);

        const apiResponse = response as {
          data?: Exercise[];
          message?: string;
        };

        this.exercises = apiResponse.data ?? [];

        this.currentPage = 1;

        this.updatePagination();

        this.loading = false;

        console.log('[CoachExercises] betöltött gyakorlatok:', this.exercises);
      },

      error: (error) => {
        console.error('[CoachExercises] Hiba a gyakorlatok betöltésekor:', error);

        this.exercises = [];

        this.currentPage = 1;

        this.totalPages = 1;

        this.loading = false;

        const backendMessage = typeof error.error === 'string' ? error.error : error.error?.message;

        this.showError(backendMessage || 'A gyakorlatok betöltése sikertelen.');
      },
    });
  }

  // ==========================================================
  // SZŰRT ÉS RENDEZETT GYAKORLATOK
  // ==========================================================

  get filteredExercises(): Exercise[] {
    const search = this.searchTerm.trim().toLowerCase();

    const result = this.exercises.filter((exercise: Exercise): boolean => {
      const exerciseName = exercise.name?.trim().toLowerCase() ?? '';

      return exerciseName.includes(search);
    });

    result.sort((a: Exercise, b: Exercise): number => {
      const nameA = a.name?.trim().toLowerCase() ?? '';

      const nameB = b.name?.trim().toLowerCase() ?? '';

      const comparison = nameA.localeCompare(nameB, 'hu', {
        sensitivity: 'base',
      });

      return this.sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }

  // ==========================================================
  // LAPOZÁS FRISSÍTÉSE
  // ==========================================================

  private updatePagination(): void {
    const exerciseCount = this.filteredExercises.length;

    this.totalPages = Math.max(1, Math.ceil(exerciseCount / this.itemsPerPage));

    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }
  }

  // ==========================================================
  // KERESÉS VÁLTOZÁSA
  // ==========================================================

  onSearchChange(): void {
    this.currentPage = 1;

    this.updatePagination();
  }

  // ==========================================================
  // RENDEZÉS VÁLTOZTATÁSA
  // ==========================================================

  toggleSort(): void {
    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';

    this.currentPage = 1;

    this.updatePagination();
  }

  // ==========================================================
  // AKTUÁLIS OLDAL GYAKORLATAI
  // ==========================================================

  get pagedExercises(): Exercise[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;

    return this.filteredExercises.slice(startIndex, startIndex + this.itemsPerPage);
  }

  // ==========================================================
  // KÖVETKEZŐ OLDAL
  // ==========================================================

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  // ==========================================================
  // ELŐZŐ OLDAL
  // ==========================================================

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
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
}
