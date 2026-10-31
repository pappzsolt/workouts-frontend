import { createInputValidationGuard } from '../../../../shared/components/form-controls/app-input.directive';
import { INTENSITY_OPTIONS } from '../../../../../constants/intensity';
import type { WorkoutExerciseView } from '../../../../../models/workout/workout-exercise-view.model';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { LoggerService } from '../../../../../services/logger.service';
import { ActivatedRoute, Router } from '@angular/router';

import { CoachWorkoutsService } from '../../../../../services/coach/coach-workouts/coach-workouts.service';
import { WorkoutExerciseService } from '../../../../../services/coach/workout-exercises.service';
import { CoachWorkspaceService } from '../../../../../services/coach/coach-workspace.service';
import { ExerciseService } from '../../../../../services/coach/coach-exercises/coach-exercises.service';
import { ProgramWorkoutService } from '../../../../../services/coach/program-workout.service';
import { skip, timer, takeUntil, distinctUntilChanged, map } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AppSelectComponent } from '../../../../../components/shared/components/app-select/app-select.component';
import { LanguageService } from '../../../../../services/shared/language.service';
import { emptyWorkoutForm } from '../../../../../services/shared/workout-mapping';
import { Exercise } from '../../../../../models/exercise.model';

import { AppFormValidationDirective } from '../../../../shared/components/form-controls/app-form-validation.directive';
import { AppInputDirective } from '../../../../shared/components/form-controls/app-input.directive';
import { AppTextareaDirective } from '../../../../shared/components/form-controls/app-textarea.directive';
import { AppCheckboxDirective } from '../../../../shared/components/form-controls/app-check.directive';
import { AppHeadingDirective } from '../../../../shared/components/app-page-header/app-page-header.component';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { MessageComponent } from '../../../../shared/components/message/message.component';
import { AppButtonComponent } from '../../../../shared/components/app-button/app-button.component';
import { FormFieldComponent } from '../../../../shared/components/form-field/form-field.component';
import { AppIconComponent } from '../../../../shared/components/app-icon/app-icon.component';
import { WorkoutExerciseListComponent } from './parts/workout-exercise-list.component';
import { WorkoutExerciseSearchComponent } from './parts/workout-exercise-search.component';
import { WorkoutEditorState } from './workout-editor-state';
import { WorkoutMetadataEditor } from './workout-metadata-editor';
import { WorkoutExerciseEditor } from './workout-exercise-editor';
import type { WorkoutEditorEffects } from './workout-editor-effects';

/**
 * Edzés szerkesztése az Edzéstárban: az edzés adatai és a gyakorlatlistája. A programban
 * lévő edzés gyakorlatlistája zárolt; ilyenkor szerkeszthető másolat készíthető.
 */
@Component({
  selector: 'app-coach-workout-edit',
  standalone: true,
  imports: [
    AppFormValidationDirective,
    AppInputDirective,
    AppTextareaDirective,
    AppCheckboxDirective,
    AppHeadingDirective,
    CommonModule,
    RouterModule,
    FormsModule,
    TranslatePipe,
    MessageComponent,
    AppButtonComponent,
    FormFieldComponent,
    AppIconComponent,
    AppSelectComponent,
    WorkoutExerciseSearchComponent,
    WorkoutExerciseListComponent,
  ],
  templateUrl: './coach-workout-edit.component.html',
  styleUrls: ['./coach-workout-edit.component.css'],
})
export class CoachWorkoutEditComponent extends WorkoutEditorState implements OnInit {
  private readonly metadata: WorkoutMetadataEditor;
  private readonly structure: WorkoutExerciseEditor;

  readonly intensityOptions = INTENSITY_OPTIONS;
  private readonly validateInputs = createInputValidationGuard();
  private readonly logger = inject(LoggerService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly workspace = inject(CoachWorkspaceService);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    coachWorkoutsService: CoachWorkoutsService,
    workoutExerciseService: WorkoutExerciseService,
    exerciseService: ExerciseService,
    programWorkoutService: ProgramWorkoutService,
    private languageService: LanguageService,
  ) {
    super();
    const effects: WorkoutEditorEffects = {
      setMessage: (message, type) => this.setMessage(message, type),
      loadWorkoutExercises: () => this.loadWorkoutExercises(),
    };
    this.metadata = new WorkoutMetadataEditor(this, coachWorkoutsService, languageService,
      this.logger, router, this.destroyRef, this.validateInputs, effects);
    this.structure = new WorkoutExerciseEditor(this, workoutExerciseService, this.workspace,
      exerciseService, programWorkoutService, languageService, this.logger, router, this.destroyRef, effects);
  }

  get canSaveWorkout(): boolean { return this.metadata.canSaveWorkout; }

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

  checkProgramAssignment(): void { this.structure.checkProgramAssignment(); }

  loadWorkout(preserveDrafts = false): void { this.metadata.loadWorkout(preserveDrafts); }

  loadExercises(): void { this.structure.loadExercises(); }

  loadWorkoutExercises(): void { this.structure.loadWorkoutExercises(); }

  private loadUsage(): void { this.structure.loadUsage(); }

  // ----------------------------------------------------------
  // Gyakorlat kiválasztása és hozzáadása
  // ----------------------------------------------------------

  isExerciseAlreadyAdded(exerciseId: number): boolean { return this.structure.isExerciseAlreadyAdded(exerciseId); }

  selectExercise(exerciseId: number | undefined): void { this.structure.selectExercise(exerciseId); }

  getSelectedExerciseName(): string { return this.structure.getSelectedExerciseName(); }

  onExerciseSearchChange(term: string): void { this.structure.onExerciseSearchChange(term); }

  /** A még hozzá nem adott gyakorlatok a keresés szerint; programban lévő edzésnél egy sem. */
  get availableExercises(): Exercise[] { return this.structure.availableExercises; }

  addExerciseToWorkout(): void { this.structure.addExerciseToWorkout(); }

  // ----------------------------------------------------------
  // Mentés
  // ----------------------------------------------------------

  saveWorkout(): void { this.metadata.saveWorkout(); }

  cancelEdit(): void {
    this.router.navigate(['/coach/workouts']);
  }

  // ----------------------------------------------------------
  // Másolat, eltávolítás és sorrend (az utóbbi kettő csak programon kívüli edzésnél)
  // ----------------------------------------------------------

  /** A programban lévő edzés zárolt; a másolat szabadon szerkeszthető, és napra tehető. */
  copyForEditing(): void { this.structure.copyForEditing(); }

  removeExercise(view: WorkoutExerciseView): void { this.structure.removeExercise(view); }

  /** Egy hellyel feljebb/lejjebb; a backend a többi gyakorlat indexét eltolja. */
  moveExercise(index: number, direction: -1 | 1): void { this.structure.moveExercise(index, direction); }

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
