import { errorMessage, responseMessage } from '../../../../models/backend-dto/common/api-response-message';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { LoggerService } from '../../../../services/logger.service';
import { ActivatedRoute, Router } from '@angular/router';

import { Subject, combineLatest, distinctUntilChanged, filter, map, switchMap, takeUntil } from 'rxjs';

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
  private readonly logger = inject(LoggerService);

  private readonly destroy$ = new Subject<void>();

  message = '';
  messageType: 'success' | 'error' | 'info' = 'info';
  loading = true;
  loadFailed = false;
  workoutId!: number;
  programId!: number;
  userWorkoutId!: number;
  programWorkoutId?: number;
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

    const queryParams = this.route.snapshot.queryParamMap;

    this.workoutName = queryParams.get('workoutName') || 'userExercises.unknownWorkout';

    const programIdParam = queryParams.get('programId');
    const userWorkoutIdParam = queryParams.get('userWorkoutId');
    const programWorkoutIdParam = queryParams.get('programWorkoutId');

    this.programId = Number(programIdParam);
    this.userWorkoutId = Number(userWorkoutIdParam);

    const parsedProgramWorkoutId = Number(programWorkoutIdParam);
    this.programWorkoutId = Number.isFinite(parsedProgramWorkoutId) && parsedProgramWorkoutId > 0
      ? parsedProgramWorkoutId
      : undefined;

    // ID VALIDÁLÁS

    if (Number.isNaN(this.workoutId) || this.workoutId <= 0) {
      this.loading = false; this.loadFailed = true; this.message = 'userExercises.loadError'; this.messageType = 'error';
      this.logger.error('Érvénytelen workout ID:', this.workoutId);
      return;
    }

    if (Number.isNaN(this.programId) || this.programId <= 0) {
      this.loading = false; this.loadFailed = true; this.message = 'userExercises.loadError'; this.messageType = 'error';
      this.logger.error('Érvénytelen program ID:', this.programId);
      return;
    }

    if (Number.isNaN(this.userWorkoutId) || this.userWorkoutId <= 0) {
      this.loading = false; this.loadFailed = true; this.message = 'userExercises.loadError'; this.messageType = 'error';
      this.logger.error('Érvénytelen userWorkout ID:', this.userWorkoutId);
      return;
    }

    // NYELV + KÉRÉS KEZELÉSE: switchMap biztosítja, hogy egy régi
    // nyelvi kérés válasza ne írja felül az újabb állapotot.
    combineLatest([
      this.languageService.language$,
      this.route.queryParamMap,
    ])
      .pipe(
        map(([language]) => language),
        distinctUntilChanged(),
        switchMap((language) => {
          this.loading = true; this.message = ''; this.loadFailed = false;
          return this.exercisesService.getWorkoutExercises(this.userWorkoutId, language);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (response) => {
          this.loading = false;
          this.loadFailed = !response.success;
          this.message = responseMessage([response], response.success ? '' : 'userExercises.loadError');
          this.messageType = response.success ? 'info' : 'error';
          const exercises = response.success ? response.data?.exercises ?? [] : [];

          if (response.data?.name) {
            this.workoutName = response.data.name;
          }

          this.allExercises = exercises;
          this.totalItems = this.allExercises.length;
          this.currentPage = 1;
          this.updatePaginatedExercises();
        },
        error: (error) => {
          this.loading = false; this.loadFailed = true;
          this.message = errorMessage(error, 'userExercises.loadError'); this.messageType = 'error';
          this.logger.error('Hiba a gyakorlatok betöltésekor:', error);

          this.allExercises = [];
          this.paginatedExercises = [];
          this.totalItems = 0;
          this.currentPage = 1;
        },
      });
  }

  // ============================================================
  // EXERCISE-EK BETÖLTÉSE
  // ============================================================


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
      queryParams: {
        programId: this.programId,
        programWorkoutId: this.programWorkoutId,
        userWorkoutId: this.userWorkoutId,
        workoutName: this.workoutName,
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
      this.logger.error('[UserWorkouts] Hibás imageUrl JSON:', exercise.imageUrl, error);

      return [];
    }
  }

  trackByExercise(index: number, exercise: WorkoutExercise): number {
    return exercise.id;
  }

  trackByImage(index: number, image: string): string {
    return image;
  }

}
