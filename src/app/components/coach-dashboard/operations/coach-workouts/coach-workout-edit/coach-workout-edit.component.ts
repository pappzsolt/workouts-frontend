import { createInputValidationGuard } from '../../../../shared/components/form-controls/app-input.directive';
import { INTENSITY_OPTIONS } from '../../../../../constants/intensity';
import type { WorkoutExerciseView } from '../../../../../models/workout/workout-exercise-view.model';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { LoggerService } from '../../../../../services/logger.service';
import { ActivatedRoute, Router } from '@angular/router';

import { CoachWorkoutsService } from '../../../../../services/coach/coach-workouts/coach-workouts.service';
import type { ApiResponse } from '../../../../../models/backend-dto/common/api-response';
import type { UserWorkoutDto } from '../../../../../models/backend-dto/workout/user-workout-dto';
import type { WorkoutWithExercises as WorkoutUiDto } from '../../../../../models/exercise.model';
import { WorkoutExerciseService } from '../../../../../services/coach/workout-exercises.service';
import { CoachWorkspaceService } from '../../../../../services/coach/coach-workspace.service';
import type { CoachProgramUsage } from '../../../../../models/coach-workspace.model';
import { ExerciseService } from '../../../../../services/coach/coach-exercises/coach-exercises.service';
import { ProgramWorkoutService } from '../../../../../services/coach/program-workout.service';
import { skip, timer, Subject, takeUntil, finalize, distinctUntilChanged, map } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AppSelectComponent } from '../../../../../components/shared/components/app-select/app-select.component';
import { LanguageService } from '../../../../../services/shared/language.service';
import type { WorkoutForm } from '../../../../../models/workout/workout-form.model';
import { emptyWorkoutForm, toWorkoutForm } from '../../../../../services/shared/workout-mapping';
import { Exercise } from '../../../../../models/exercise.model';
import { HttpErrorResponse } from '@angular/common/http';

import { SHARED_IMPORTS } from '../../../../shared/shared-imports';
import { WorkoutFormDrafts } from './workout-form-drafts';
import { WorkoutExerciseListComponent } from './parts/workout-exercise-list.component';
import { WorkoutExerciseSearchComponent } from './parts/workout-exercise-search.component';
import {
  containsExercise,
  selectableExercises,
  toWorkoutExerciseViews,
} from './workout-edit.helpers';

/**
 * Edzés szerkesztése az Edzéstárban: az edzés adatai és a gyakorlatlistája. A programban
 * lévő edzés gyakorlatlistája zárolt; ilyenkor szerkeszthető másolat készíthető.
 */
@Component({
  selector: 'app-coach-workout-edit',
  standalone: true,
  imports: [...SHARED_IMPORTS, AppSelectComponent, WorkoutExerciseSearchComponent, WorkoutExerciseListComponent],
  templateUrl: './coach-workout-edit.component.html',
  styleUrls: ['./coach-workout-edit.component.css'],
})
export class CoachWorkoutEditComponent implements OnInit {
  readonly intensityOptions = INTENSITY_OPTIONS;
  private readonly validateInputs = createInputValidationGuard();
  private readonly logger = inject(LoggerService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly workspace = inject(CoachWorkspaceService);

  // ----------------------------------------------------------
  // Az edzés űrlapja
  // ----------------------------------------------------------

  private readonly workoutLoadCancelled$ = new Subject<void>();
  private readonly exercisesLoadCancelled$ = new Subject<void>();
  private readonly workoutExercisesLoadCancelled$ = new Subject<void>();
  private readonly assignmentLoadCancelled$ = new Subject<void>();
  private readonly contextCancelled$ = new Subject<void>();
  private readonly messageCancelled$ = new Subject<void>();
  private readonly drafts = new WorkoutFormDrafts();
  loadingWorkout = false;
  savingWorkout = false;
  private workoutReady = false;

  workoutId?: number;
  workout: WorkoutForm = emptyWorkoutForm();

  message = '';
  messageType: 'success' | 'error' | '' = '';

  // ----------------------------------------------------------
  // Gyakorlatok
  // ----------------------------------------------------------

  /** Igaz, ha az edzés már legalább egy programban szerepel: ekkor a gyakorlatlista zárolt. */
  workoutAssignedToProgram = false;
  checkingProgramAssignment = false;
  private assignmentVerified = false;

  get canEditStructure(): boolean {
    return this.assignmentVerified && !this.checkingProgramAssignment && !this.workoutAssignedToProgram;
  }

  /** Az összes választható gyakorlat. */
  exercises: Exercise[] = [];
  /** Az edzés jelenlegi gyakorlatai. */
  workoutExercises: WorkoutExerciseView[] = [];
  selectedExerciseId: number | null = null;
  exerciseSearchTerm = '';
  loadingExercises = false;
  addingExercise = false;
  structureBusy = false;

  // Programok, amelyek használják; másolat szerkesztéshez
  usedInPrograms: CoachProgramUsage[] = [];
  copying = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private coachWorkoutsService: CoachWorkoutsService,
    private workoutExerciseService: WorkoutExerciseService,
    private exerciseService: ExerciseService,
    private programWorkoutService: ProgramWorkoutService,
    private languageService: LanguageService,
  ) {}

  get canSaveWorkout(): boolean {
    return this.workoutReady && !this.loadingWorkout && !this.savingWorkout &&
      this.drafts.context === `${this.workoutId}:${this.languageService.getCurrentLanguage()}`;
  }

  ngOnInit(): void {
    this.languageService.language$
      .pipe(skip(1), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.loadWorkout(true);
        this.loadExercises();
        this.loadWorkoutExercises();
        this.checkProgramAssignment();
      });

    this.route.paramMap.pipe(
      map(params => Number(params.get('id'))),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(id => {
      this.contextCancelled$.next();
      this.workoutLoadCancelled$.next();
      this.exercisesLoadCancelled$.next();
      this.workoutExercisesLoadCancelled$.next();
      this.assignmentLoadCancelled$.next();
      this.messageCancelled$.next();
      this.workoutId = undefined;
      this.workoutReady = false;
      this.workout = emptyWorkoutForm();
      this.workoutExercises = [];
      this.usedInPrograms = [];
      this.selectedExerciseId = null;
      this.exerciseSearchTerm = '';
      this.assignmentVerified = false;
      this.workoutAssignedToProgram = false;
      this.checkingProgramAssignment = false;
      this.loadingWorkout = false;
      this.savingWorkout = false;
      this.addingExercise = false;
      this.structureBusy = false;
      this.copying = false;
      this.message = '';
      this.messageType = '';
      if (!Number.isSafeInteger(id) || id <= 0) {
        this.setMessage('coachWorkoutEdit.invalidWorkoutId', 'error');
        return;
      }
      this.workoutId = id;
      this.loadWorkout();
      this.loadExercises();
      this.loadWorkoutExercises();
      this.checkProgramAssignment();
      this.loadUsage();
    });
  }

  // ----------------------------------------------------------
  // Betöltés
  // ----------------------------------------------------------

  checkProgramAssignment(): void {
    if (!this.workoutId) return;
    this.assignmentLoadCancelled$.next();
    this.assignmentVerified = false;
    this.checkingProgramAssignment = true;
    this.programWorkoutService.isWorkoutAssignedToAnyProgram(this.workoutId)
      .pipe(takeUntil(this.assignmentLoadCancelled$), takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (response) => {
          this.assignmentVerified = response.success && typeof response.data?.assigned === 'boolean';
          this.workoutAssignedToProgram = response.data?.assigned === true;
          if (!this.assignmentVerified) this.setMessage('coachWorkoutEdit.loadError', 'error');
          this.checkingProgramAssignment = false;
        },
        error: (error: HttpErrorResponse) => {
          this.logger.error('Hiba a workout programhoz tartozásának ellenőrzésekor:', error);
          this.assignmentVerified = false;
          this.setMessage('coachWorkoutEdit.loadError', 'error');
          this.checkingProgramAssignment = false;
        },
      });
  }

  loadWorkout(preserveDrafts = false): void {
    if (!this.workoutId) return;

    this.workoutLoadCancelled$.next();
    const workoutId = this.workoutId;
    const language = this.languageService.getCurrentLanguage();
    this.drafts.beginLoad(this.workout, workoutId, language, preserveDrafts);
    this.loadingWorkout = true;
    this.workoutReady = false;
    this.coachWorkoutsService.getWorkoutById(workoutId, language)
      .pipe(takeUntil(this.workoutLoadCancelled$), takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (res: ApiResponse<UserWorkoutDto>) => {
          this.loadingWorkout = false;
          if (!res.success || !res.data) {
            this.setMessage(res.message || 'coachWorkoutEdit.notFound', 'error');
            return;
          }
          const loaded = toWorkoutForm(this.workout, res.data);
          this.workout = this.drafts.applyLoaded(this.workout, loaded, workoutId, language, preserveDrafts);
          this.workoutReady = true;
        },
        error: (error) => {
          this.loadingWorkout = false;
          this.logger.error('Hiba a workout betöltésekor:', error);
          this.setMessage('coachWorkoutEdit.loadError', 'error');
        },
      });
  }

  loadExercises(): void {
    this.exercisesLoadCancelled$.next();
    this.loadingExercises = true;
    this.exerciseService.getAllExercises()
      .pipe(takeUntil(this.exercisesLoadCancelled$), takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (response: ApiResponse<Exercise[]>) => {
          this.exercises = response.data ?? [];
          this.loadingExercises = false;
        },
        error: (error) => {
          this.logger.error('Hiba az exercise-ek betöltésekor:', error);
          this.exercises = [];
          this.loadingExercises = false;
          this.setMessage('coachWorkoutEdit.loadExercisesError', 'error');
        },
      });
  }

  loadWorkoutExercises(): void {
    if (!this.workoutId) return;
    this.workoutExercisesLoadCancelled$.next();
    this.exerciseService.getWorkoutExercises(this.workoutId)
      .pipe(takeUntil(this.workoutExercisesLoadCancelled$), takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (workout: WorkoutUiDto) => {
          this.workoutExercises = toWorkoutExerciseViews(workout, this.workoutId!);
        },
        error: (error: HttpErrorResponse) => {
          this.logger.error('Hiba a workout exercise-ek betöltésekor:', error);
          this.workoutExercises = [];
          this.setMessage('coachWorkoutEdit.loadWorkoutExercisesError', 'error');
        },
      });
  }

  private loadUsage(): void {
    if (!this.workoutId) return;
    this.workspace.programsUsingWorkout(this.workoutId).pipe(takeUntil(this.contextCancelled$), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (programs) => (this.usedInPrograms = programs),
      error: () => (this.usedInPrograms = []),
    });
  }

  // ----------------------------------------------------------
  // Gyakorlat kiválasztása és hozzáadása
  // ----------------------------------------------------------

  isExerciseAlreadyAdded(exerciseId: number): boolean {
    return containsExercise(this.workoutExercises, exerciseId);
  }

  selectExercise(exerciseId: number | undefined): void {
    if (exerciseId == null || !this.canEditStructure) return;
    if (this.workoutAssignedToProgram) {
      this.setMessage('coachWorkoutEdit.workoutAssigned', 'error');
      return;
    }
    this.selectedExerciseId = exerciseId;
  }

  getSelectedExerciseName(): string {
    if (this.selectedExerciseId == null) return '';
    return this.exercises.find((exercise) => Number(exercise.id) === Number(this.selectedExerciseId))?.name || '';
  }

  onExerciseSearchChange(term: string): void {
    this.exerciseSearchTerm = term;
    if (!term) this.selectedExerciseId = null;
  }

  /** A még hozzá nem adott gyakorlatok a keresés szerint; programban lévő edzésnél egy sem. */
  get availableExercises(): Exercise[] {
    if (!this.canEditStructure) return [];
    return selectableExercises(this.exercises, this.workoutExercises, this.exerciseSearchTerm,
      this.languageService.getCurrentLanguage());
  }

  addExerciseToWorkout(): void {
    if (!this.workoutId) {
      this.setMessage('coachWorkoutEdit.invalidWorkoutId', 'error');
      return;
    }
    // Megvárjuk a programhoz tartozás ellenőrzését; a backend ettől függetlenül is véd.
    if (!this.canEditStructure || this.addingExercise || this.structureBusy) return;
    if (this.workoutAssignedToProgram) {
      this.setMessage('coachWorkoutEdit.workoutAssigned', 'error');
      return;
    }
    if (!this.selectedExerciseId) {
      this.setMessage('coachWorkoutEdit.selectExercise', 'error');
      return;
    }
    if (this.isExerciseAlreadyAdded(this.selectedExerciseId)) {
      this.setMessage('coachWorkoutEdit.exerciseAlreadyAdded', 'error');
      return;
    }

    const exerciseId = this.selectedExerciseId;
    const workoutId = this.workoutId;
    this.addingExercise = true;
    this.workoutExerciseService.assignExerciseToWorkout(workoutId, exerciseId).pipe(takeUntil(this.contextCancelled$), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        const addedExercise = this.exercises.find((exercise) => Number(exercise.id) === Number(exerciseId));
        // A backend nem küldi vissza az új kapcsolatot: a listába a szükséges adatok kerülnek.
        if (addedExercise && !this.isExerciseAlreadyAdded(exerciseId)) {
          this.workoutExercises.push({
            workoutId,
            exerciseId: addedExercise.id,
            exercise: addedExercise,
            sets: addedExercise.sets ?? 0,
            repetitions: addedExercise.repetitions ?? 0,
            orderIndex: this.workoutExercises.length,
            restSeconds: 0,
            done: false,
          });
        }
        this.selectedExerciseId = null;
        this.addingExercise = false;
        this.setMessage('coachWorkoutEdit.addSuccess', 'success');
      },
      error: (error: HttpErrorResponse) => {
        this.logger.error('Hiba az exercise workoutba adásakor:', error);
        this.addingExercise = false;
        const backendMessage = error?.error?.message ?? error?.error?.error ?? error?.message;
        this.setMessage(backendMessage || 'coachWorkoutEdit.addError', 'error');
      },
    });
  }

  // ----------------------------------------------------------
  // Mentés
  // ----------------------------------------------------------

  saveWorkout(): void {
    if (!this.canSaveWorkout) return;
    if (!this.validateInputs()) return;
    if (!this.workoutId) return;

    const payload: WorkoutForm = { ...this.workout, workoutDate: this.workout.workoutDate };
    const context = this.drafts.context;
    const language = this.languageService.getCurrentLanguage();
    const unchangedContext = () => this.drafts.context === context && this.languageService.getCurrentLanguage() === language;
    this.savingWorkout = true;
    this.coachWorkoutsService.updateWorkout(this.workoutId, payload, language).pipe(
      takeUntil(this.contextCancelled$),
      takeUntilDestroyed(this.destroyRef),
      finalize(() => { this.savingWorkout = false; }),
    ).subscribe({
      next: (res) => {
        if (!unchangedContext()) return;
        if (res.success && res.data?.status === 'ok') {
          this.setMessage('coachWorkoutEdit.updateSuccess', 'success');
          timer(1500)
            .pipe(takeUntil(this.contextCancelled$), takeUntilDestroyed(this.destroyRef))
            .subscribe(() => {
              if (unchangedContext()) void this.router.navigate(['/coach/workouts']);
            });
        } else {
          this.setMessage(res.data?.message || res.message || 'coachWorkoutEdit.updateError', 'error');
        }
      },
      error: (error) => {
        if (!unchangedContext()) return;
        this.logger.error('Hiba a workout mentésekor:', error);
        const backendMessage = error?.error?.message ?? error?.error?.error ?? error?.message;
        this.setMessage(backendMessage || 'coachWorkoutEdit.saveError', 'error');
      },
    });
  }

  cancelEdit(): void {
    this.router.navigate(['/coach/workouts']);
  }

  // ----------------------------------------------------------
  // Másolat, eltávolítás és sorrend (az utóbbi kettő csak programon kívüli edzésnél)
  // ----------------------------------------------------------

  /** A programban lévő edzés zárolt; a másolat szabadon szerkeszthető, és napra tehető. */
  copyForEditing(): void {
    if (!this.workoutId || this.copying) return;
    this.copying = true;
    const name = `${this.workout?.name ?? ''} (2)`.trim();
    this.workspace.copyWorkout(this.workoutId, name).pipe(takeUntil(this.contextCancelled$), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (id) => {
        this.copying = false;
        void this.router.navigate(['/coach/workouts', id, 'edit']);
      },
      error: (error: HttpErrorResponse) => {
        this.copying = false;
        this.setMessage(error?.error?.message || error?.message || 'coachWorkoutEdit.copyError', 'error');
      },
    });
  }

  removeExercise(view: WorkoutExerciseView): void {
    const exerciseId = view.exerciseId ?? view.exercise?.id;
    if (!this.workoutId || exerciseId == null || !this.canEditStructure || this.structureBusy || this.addingExercise) return;
    this.structureBusy = true;
    this.workoutExerciseService.deleteExerciseFromWorkout(this.workoutId, exerciseId).pipe(takeUntil(this.contextCancelled$), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res) => {
        this.structureBusy = false;
        if (!res.success) {
          this.setMessage(res.message || 'coachWorkoutEdit.removeExerciseError', 'error');
          return;
        }
        this.setMessage('coachWorkoutEdit.exerciseRemoved', 'success');
        this.loadWorkoutExercises();
      },
      error: (error: HttpErrorResponse) => {
        this.structureBusy = false;
        this.setMessage(error?.error?.message || 'coachWorkoutEdit.removeExerciseError', 'error');
      },
    });
  }

  /** Egy hellyel feljebb/lejjebb; a backend a többi gyakorlat indexét eltolja. */
  moveExercise(index: number, direction: -1 | 1): void {
    const a = this.workoutExercises[index];
    const b = this.workoutExercises[index + direction];
    if (!this.workoutId || !a || !b || !this.canEditStructure || this.structureBusy || this.addingExercise) return;
    const exerciseId = a.exerciseId ?? a.exercise?.id;
    const targetIndex = b.orderIndex ?? index + direction;
    if (exerciseId == null) return;
    this.structureBusy = true;
    this.workoutExerciseService.updateOrderIndex(this.workoutId, exerciseId, targetIndex).pipe(takeUntil(this.contextCancelled$), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res) => {
        this.structureBusy = false;
        if (!res.success) this.setMessage(res.message || 'coachWorkoutEdit.reorderError', 'error');
        this.loadWorkoutExercises();
      },
      error: (error: HttpErrorResponse) => {
        this.structureBusy = false;
        this.setMessage(error?.error?.message || 'coachWorkoutEdit.reorderError', 'error');
        this.loadWorkoutExercises();
      },
    });
  }

  private setMessage(msg: string, type: 'success' | 'error'): void {
    this.messageCancelled$.next();
    this.message = msg;
    this.messageType = type;
    timer(4000)
      .pipe(takeUntil(this.messageCancelled$), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.message = '';
        this.messageType = '';
      });
  }
}
