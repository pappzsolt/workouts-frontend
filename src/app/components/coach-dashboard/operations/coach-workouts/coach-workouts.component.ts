import { errorMessage, responseMessage } from '../../../../models/backend-dto/common/api-response-message';
import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges, inject } from '@angular/core';
import { LoggerService } from '../../../../services/logger.service';
import { Router } from '@angular/router';

import { Subject, debounceTime, distinctUntilChanged, switchMap, takeUntil, timer } from 'rxjs';

import {
  CoachWorkoutsService,
  WorkoutLibraryPage,
  WorkoutLibrarySort,
} from '../../../../services/coach/coach-workouts/coach-workouts.service';
import { LanguageService } from '../../../../services/shared/language.service';
import { SHARED_IMPORTS } from '../../../shared/shared-imports';
import { Workout } from '../../../../models/workout.model';
import { WorkoutWithExercises } from '../../../../models/exercise.model';
import { AppCardComponent } from '../../../shared/components/app-card/app-card.component';
import { USER_MESSAGES } from '../../../../constants/user-messages';
import { AppSearchComponent } from '../../../../components/shared/components/app-search/app-search.component';
import { PaginationComponent } from '../../../../components/shared/components/pagination/pagination.component';
import { NewWorkoutComponent } from '../../operations/coach-workouts/coach-workout-new/new-workout.component';
import { AppButtonComponent } from '../../../../components/shared/components/app-button/app-button.component';

@Component({
  selector: 'app-coach-workouts',
  standalone: true,
  imports: [
    ...SHARED_IMPORTS,
    NewWorkoutComponent,
    AppCardComponent,
    AppSearchComponent,
    PaginationComponent,
    AppButtonComponent,
  ],
  templateUrl: './coach-workouts.component.html',
  styleUrls: ['./coach-workouts.component.css'],
})
export class WorkoutListComponent implements OnInit, OnChanges, OnDestroy {
  private readonly logger = inject(LoggerService);

  private readonly destroy$ = new Subject<void>();

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
    durationMinutes: 0,
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

  messageType: 'success' | 'error' | '' = '';

  // ==========================================================
  // WORKOUT TÖRLÉS
  // ==========================================================

  pendingDeleteWorkoutId: number | null = null;
  pendingDeleteWorkoutName = '';
  deletingWorkout = false;

  // ==========================================================
  // ÚJ WORKOUT FORM
  // ==========================================================

  showNewWorkoutForm: boolean = false;

  // ==========================================================
  // LAPOZÁS
  // ==========================================================

  currentPage: number = 1;

  itemsPerPage: number = 6;

  totalPages: number = 1;

  /** A szűrésnek megfelelő összes edzés száma (a backend adja). */
  totalItems: number = 0;

  loading = false;

  /** Lekérések sora: mindig csak a legutolsó kérés válasza számít. */
  private readonly pageRequests$ = new Subject<void>();

  /** Gépelés közben nem kérünk minden leütésre. */
  private readonly searchChanges$ = new Subject<string>();

  // ==========================================================
  // KERESÉS
  // ==========================================================

  searchTerm: string = '';

  // ==========================================================
  // RENDEZÉS
  // ==========================================================

  /** Alapból a legújabb elöl (a backend sorrendje); a gomb név szerinti rendezésre vált. */
  sortMode: WorkoutLibrarySort = 'newest';

  constructor(
    private coachWorkoutsService: CoachWorkoutsService,
    private languageService: LanguageService,
    private router: Router,
  ) {}

  // ==========================================================
  // INIT
  // ==========================================================

  ngOnInit(): void {
    this.pageRequests$
      .pipe(
        switchMap(() =>
          this.coachWorkoutsService.getWorkoutLibraryPage(
            this.currentPage,
            this.itemsPerPage,
            this.searchTerm,
            this.sortMode,
          ),
        ),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (page) => this.applyPage(page),
        error: (error) => {
          this.loading = false;
          this.logger.error('[CoachWorkouts] workout betöltési hiba:', error);
          this.workouts = [];
          this.totalItems = 0;
          this.totalPages = 1;
          this.setMessage('coachWorkouts.loadError', 'error');
        },
      });

    this.searchChanges$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.currentPage = 1;
        this.loadWorkouts();
      });

    this.languageService.language$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.loadWorkouts();
    });
  }

  // ==========================================================
  // DESTROY
  // ==========================================================

  ngOnDestroy(): void {
    this.destroy$.next();

    this.destroy$.complete();
  }

  // ==========================================================
  // INPUT VÁLTOZÁS
  // ==========================================================

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['programId'] && !changes['programId'].firstChange) {
      this.loadWorkouts();
    }
  }

  // ==========================================================
  // WORKOUTOK BETÖLTÉSE
  // ==========================================================

  /** Az aktuális oldal lekérése a backendtől (lapozás, keresés, rendezés ott történik). */
  loadWorkouts(): void {
    this.loading = true;
    this.pageRequests$.next();
  }

  private applyPage(page: WorkoutLibraryPage): void {
    this.loading = false;
    this.totalItems = page.totalElements;
    this.totalPages = Math.max(1, page.totalPages);

    // Ha az oldal közben kiürült (pl. törlés után az utolsó oldalon), visszalépünk.
    if (page.items.length === 0 && this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
      this.loadWorkouts();
      return;
    }

    this.workouts = page.items.map(toLibraryWorkout);
  }

  // ==========================================================
  // KERESÉS VÁLTOZÁSA
  // ==========================================================

  onSearchChange(): void {
    this.searchChanges$.next(this.searchTerm.trim());
  }

  // ==========================================================
  // RENDEZÉS VÁLTOZTATÁSA
  // ==========================================================

  toggleSort(): void {
    // Legújabb elöl → név A–Z → név Z–A → legújabb elöl
    this.sortMode = this.sortMode === 'newest' ? 'nameAsc' : this.sortMode === 'nameAsc' ? 'nameDesc' : 'newest';
    this.currentPage = 1;
    this.loadWorkouts();
  }

  // ==========================================================
  // LAPOZÁS
  // ==========================================================

  onPageChange(page: number): void {
    if (page === this.currentPage) {
      return;
    }
    this.currentPage = page;
    this.loadWorkouts();
  }

  // ==========================================================
  // WORKOUT HOZZÁADÁSA
  // ==========================================================

  addWorkout(): void {
    if (this.programId === undefined || this.programId === null) {
      return;
    }

    this.newWorkout.programId = this.programId;

    this.coachWorkoutsService.addWorkout(this.newWorkout).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        if (res.data?.done === true) {
          this.setMessage(res.data.message || res.message || 'coachWorkouts.addSuccess', 'success');

          this.newWorkout = {
            workoutName: '',
            description: '',
            durationMinutes: 0,
          };

          this.loadWorkouts();
        } else {
          this.setMessage(res.data?.message || res.message || 'coachWorkouts.addError', 'error');
        }
      },

      error: () => {
        this.setMessage('coachWorkouts.addError', 'error');
      },
    });
  }

  // ==========================================================
  // WORKOUT SZERKESZTÉSE
  // ==========================================================

  editWorkout(workoutId: number | undefined, event: MouseEvent): void {
    event.stopPropagation();

    if (workoutId === undefined || workoutId === null || workoutId <= 0) {
      this.message = USER_MESSAGES.workoutClickError;

      return;
    }

    this.router.navigate([`/coach/workouts/${workoutId}/edit`]).catch((error) => {
      this.logger.error('router.navigate hiba:', error);

      this.message = USER_MESSAGES.workoutClickError;
    });
  }

  // ==========================================================
  // WORKOUT TÖRLÉSE
  // ==========================================================

  requestDeleteWorkout(workout: Workout, event: MouseEvent): void {
    event.stopPropagation();

    const workoutId = workout.id;
    if (workoutId == null || workoutId <= 0) {
      this.logger.error('Érvénytelen workout ID törléshez:', workoutId);
      this.setMessage('A workout nem törölhető: érvénytelen azonosító.', 'error');
      return;
    }

    this.pendingDeleteWorkoutId = workoutId;
    this.pendingDeleteWorkoutName = workout.workoutName ?? workout.name ?? '';
    this.message = '';
    this.messageType = '';
  }

  cancelDeleteWorkout(): void {
    if (this.deletingWorkout) {
      return;
    }

    this.pendingDeleteWorkoutId = null;
    this.pendingDeleteWorkoutName = '';
  }

  confirmDeleteWorkout(): void {
    const workoutId = this.pendingDeleteWorkoutId;

    if (workoutId === null || this.deletingWorkout) {
      return;
    }

    this.deletingWorkout = true;

    this.coachWorkoutsService
      .deleteWorkout(workoutId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.deletingWorkout = false;

          if (!response.success) {
            this.setMessage(responseMessage([response], 'A workout törlése sikertelen.'), 'error');
            return;
          }

          this.pendingDeleteWorkoutId = null;
          this.pendingDeleteWorkoutName = '';

          const savedMessage = responseMessage([response], 'Workout sikeresen törölve.');

          // Lokálisan is kivesszük, így nincs villanás a frissítés előtt.
          this.workouts = this.workouts.filter((workout) => workout.id !== workoutId);

          this.setMessage(savedMessage, 'success');
          this.loadWorkouts();
        },
        error: (error) => {
          this.deletingWorkout = false;
          this.logger.error('[CoachWorkouts] workout törlési hiba:', error);
          this.setMessage(errorMessage(error, 'A workout törlése sikertelen.'), 'error');
        },
      });
  }

  get deleteWorkoutConfirmMessage(): string {
    const name = this.pendingDeleteWorkoutName.trim();
    return name
      ? `Biztosan törlöd ezt a workoutot: ${name}? A művelet nem vonható vissza.`
      : 'Biztosan törlöd ezt a workoutot? A művelet nem vonható vissza.';
  }

  // ==========================================================
  // ÚJ WORKOUT FORM KI/BE
  // ==========================================================

  toggleNewWorkout(): void {
    this.showNewWorkoutForm = !this.showNewWorkoutForm;
  }

  // ==========================================================
  // ÜZENET
  // ==========================================================

  private setMessage(msg: string, type: 'success' | 'error'): void {
    this.message = msg;

    this.messageType = type;

    timer(4000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.message = '';
        this.messageType = '';
      });
  }

  // ==========================================================
  // ÚJ WORKOUT OLDAL
  // ==========================================================

  goToNewWorkout(): void {
    this.router.navigate(['/coach/workouts/new']);
  }

  trackByWorkout(index: number, workout: Workout): number | string {
    return workout.id ?? workout.programWorkoutId ?? index;
  }

}

/** Backend edzés → edzéstár kártya. */
function toLibraryWorkout(w: WorkoutWithExercises): Workout {
  return {
    id: w.id,
    programNames: w.programNames ?? [],
    workoutName: w.name ?? '',
    description: w.description ?? '',
    durationMinutes: w.durationMinutes,
    difficultyLevel: undefined,
    exercises: w.exercises ?? [],
  };
}
