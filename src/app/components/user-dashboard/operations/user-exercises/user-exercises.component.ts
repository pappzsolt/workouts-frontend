import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { Subject, takeUntil } from 'rxjs';

import { UserExerciseService } from '../../../../services/user/user-exercise/user-exercise.service';
import { LanguageService } from '../../../../services/shared/language.service';

import { WorkoutExercise, Exercise } from '../../../../models/exercise.model';
import { SidePaginationComponent } from '../../../../components/shared/components/side-pagination/side-pagination.component';
import { SHARED_IMPORTS } from '../../../shared/shared-imports';

@Component({
  standalone: true,
  selector: 'app-user-exercises',
  imports: [...SHARED_IMPORTS, SidePaginationComponent],
  styleUrl: './user-exercises.component.css',
  templateUrl: './user-exercises.component.html',
})
export class UserExercisesComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  workoutId!: number;
  programId!: number;
  workoutName!: string;

  // ============================================================
  // EXERCISE ADATOK
  // ============================================================

  private allExercises: WorkoutExercise[] = [];

  // ============================================================
  // PAGINATION
  // ============================================================

  currentPage = 1;
  pageSize = 1;

  paginatedExercises: WorkoutExercise[] = [];

  totalItems = 0;

  // ============================================================
  // PAGINATION GETTERS
  // ============================================================

  get totalPages(): number {
    return Math.ceil(this.totalItems / this.pageSize);
  }

  get startItem(): number {
    return this.totalItems === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1;
  }

  get endItem(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalItems);
  }

  // ============================================================
  // CONSTRUCTOR
  // ============================================================

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private exercisesService: UserExerciseService,
    private languageService: LanguageService,
  ) {}

  // ============================================================
  // INIT
  // ============================================================

  ngOnInit(): void {
    // WORKOUT ID A ROUTE PARAMÉTERBŐL

    this.workoutId = Number(this.route.snapshot.paramMap.get('workoutId'));

    // NAVIGATION STATE

    const navState = history.state;

    this.workoutName = navState?.workoutName || 'userExercises.unknownWorkout';

    this.programId = Number(navState?.programId);

    // ID VALIDÁLÁS

    if (Number.isNaN(this.workoutId) || this.workoutId <= 0) {
      console.error('Érvénytelen workout ID:', this.workoutId);
      return;
    }

    if (Number.isNaN(this.programId) || this.programId <= 0) {
      console.error('Érvénytelen program ID:', this.programId);
      return;
    }

    // NYELVVÁLTÁS FIGYELÉSE

    this.languageService.language$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.loadExercises();
    });
  }

  // ============================================================
  // EXERCISE-EK BETÖLTÉSE
  // ============================================================

  private loadExercises(): void {
    this.exercisesService
      .getWorkoutExercises(this.programId, this.workoutId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const exercises = response.data?.exercises ?? [];

          // TELJES LISTA ELTÁROLÁSA

          this.allExercises = exercises;

          // PAGINATION ADATOK FRISSÍTÉSE

          this.totalItems = this.allExercises.length;
          this.currentPage = 1;

          this.updatePaginatedExercises();
        },

        error: (error) => {
          console.error('Hiba a gyakorlatok betöltésekor:', error);

          this.allExercises = [];
          this.paginatedExercises = [];
          this.totalItems = 0;
          this.currentPage = 1;
        },
      });
  }

  // ============================================================
  // LAPOZOTT GYAKORLATOK FRISSÍTÉSE
  // ============================================================

  private updatePaginatedExercises(): void {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;

    this.paginatedExercises = this.allExercises.slice(startIndex, endIndex);
  }

  // ============================================================
  // KÖZÖS LAPOZÓ ESEMÉNYKEZELŐ
  // ============================================================

  onExercisePageChange(page: number): void {
    if (page < 1 || page > this.totalPages) {
      return;
    }

    this.currentPage = page;

    this.updatePaginatedExercises();
  }

  // ============================================================
  // EXERCISE OLDALRA NAVIGÁLÁS
  // ============================================================

  goToExercise(exerciseId: number): void {
    this.router.navigate(['/user/workouts', this.workoutId, 'exercises', exerciseId], {
      state: {
        workoutName: this.workoutName,
        programId: this.programId,
      },
    });
  }

  // ============================================================
  // DESTROY
  // ============================================================

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============================================================
  // EXERCISE KÉPEK
  // ============================================================

  getExerciseImages(exercise: Exercise): string[] {
    if (!exercise.imageUrl) {
      return [];
    }

    try {
      const images = JSON.parse(exercise.imageUrl);

      return Array.isArray(images) ? images : [];
    } catch (error) {
      console.error('[UserWorkouts] Hibás imageUrl JSON:', exercise.imageUrl, error);

      return [];
    }
  }
}
