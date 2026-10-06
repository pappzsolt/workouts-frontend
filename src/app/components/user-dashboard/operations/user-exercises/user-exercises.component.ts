import { errorMessage, responseMessage } from '../../../../models/backend-dto/common/api-response-message';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { LoggerService } from '../../../../services/logger.service';
import { ActivatedRoute, Router } from '@angular/router';

import { EMPTY, Subject, catchError, combineLatest, distinctUntilChanged, map, switchMap, takeUntil } from 'rxjs';

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
    combineLatest([this.route.paramMap, this.route.queryParamMap, this.languageService.language$])
      .pipe(
        map(([params, query, language]) => ({
          workoutId: Number(params.get('workoutId')),
          programId: Number(query.get('programId')),
          userWorkoutId: Number(query.get('userWorkoutId')),
          programWorkoutId: Number(query.get('programWorkoutId')),
          workoutName: query.get('workoutName') || 'userExercises.unknownWorkout',
          language,
        })),
        distinctUntilChanged((previous, current) => JSON.stringify(previous) === JSON.stringify(current)),
        switchMap(context => {
          this.workoutId = context.workoutId;
          this.programId = context.programId;
          this.userWorkoutId = context.userWorkoutId;
          this.programWorkoutId = Number.isInteger(context.programWorkoutId) && context.programWorkoutId > 0
            ? context.programWorkoutId : undefined;
          this.workoutName = context.workoutName;
          this.allExercises = [];
          this.paginatedExercises = [];
          this.totalItems = 0;
          this.currentPage = 1;
          this.message = '';
          this.loadFailed = false;
          if (![this.workoutId, this.programId, this.userWorkoutId].every(id => Number.isInteger(id) && id > 0)) {
            this.loading = false;
            this.loadFailed = true;
            this.message = 'userExercises.loadError';
            this.messageType = 'error';
            return EMPTY;
          }
          this.loading = true;
          return this.exercisesService.getWorkoutExercises(context.userWorkoutId, context.language).pipe(
            catchError(error => {
              this.loading = false;
              this.loadFailed = true;
              this.message = errorMessage(error, 'userExercises.loadError');
              this.messageType = 'error';
              return EMPTY;
            }),
          );
        }),
        takeUntil(this.destroy$),
      ).subscribe(response => {
        this.loading = false;
        this.loadFailed = !response.success;
        this.message = responseMessage([response], response.success ? '' : 'userExercises.loadError');
        this.messageType = response.success ? 'info' : 'error';
        this.allExercises = response.success ? response.data?.exercises ?? [] : [];
        if (response.success && response.data?.name) this.workoutName = response.data.name;
        this.totalItems = this.allExercises.length;
        this.updatePaginatedExercises();
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
