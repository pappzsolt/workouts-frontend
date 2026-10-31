import type { DestroyRef } from '@angular/core';
import type { Router } from '@angular/router';
import { finalize, takeUntil, timer } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { CoachWorkoutsService } from '../../../../../services/coach/coach-workouts/coach-workouts.service';
import type { LanguageService } from '../../../../../services/shared/language.service';
import type { LoggerService } from '../../../../../services/logger.service';
import type { ApiResponse } from '../../../../../models/backend-dto/common/api-response';
import type { UserWorkoutDto } from '../../../../../models/backend-dto/workout/user-workout-dto';
import type { WorkoutForm } from '../../../../../models/workout/workout-form.model';
import { toWorkoutForm } from '../../../../../services/shared/workout-mapping';
import type { WorkoutEditorState } from './workout-editor-state';
import type { WorkoutEditorEffects } from './workout-editor-effects';

/** Loads and saves metadata, including language-scoped drafts. */
export class WorkoutMetadataEditor {
  constructor(
    private readonly state: WorkoutEditorState,
    private readonly coachWorkoutsService: CoachWorkoutsService,
    private readonly languageService: LanguageService,
    private readonly logger: LoggerService,
    private readonly router: Router,
    private readonly destroyRef: DestroyRef,
    private readonly validateInputs: () => boolean,
    private readonly effects: WorkoutEditorEffects,
  ) {}

  get canSaveWorkout(): boolean {
    return this.state.workoutReady && !this.state.loadingWorkout && !this.state.savingWorkout &&
      this.state.drafts.context === `${this.state.workoutId}:${this.languageService.getCurrentLanguage()}`;
  }

  loadWorkout(preserveDrafts = false): void {
    if (!this.state.workoutId) return;

    this.state.workoutLoadCancelled$.next();
    const workoutId = this.state.workoutId;
    const language = this.languageService.getCurrentLanguage();
    this.state.drafts.beginLoad(this.state.workout, workoutId, language, preserveDrafts);
    this.state.loadingWorkout = true;
    this.state.workoutReady = false;
    this.coachWorkoutsService.getWorkoutById(workoutId, language)
      .pipe(takeUntil(this.state.workoutLoadCancelled$), takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (res: ApiResponse<UserWorkoutDto>) => {
          this.state.loadingWorkout = false;
          if (!res.success || !res.data) {
            this.effects.setMessage(res.message || 'coachWorkoutEdit.notFound', 'error');
            return;
          }
          const loaded = toWorkoutForm(this.state.workout, res.data);
          this.state.workout = this.state.drafts.applyLoaded(this.state.workout, loaded, workoutId, language, preserveDrafts);
          this.state.workoutReady = true;
        },
        error: (error) => {
          this.state.loadingWorkout = false;
          this.logger.error('Hiba a workout betöltésekor:', error);
          this.effects.setMessage('coachWorkoutEdit.loadError', 'error');
        },
      });
  }

  saveWorkout(): void {
    if (!this.canSaveWorkout) return;
    if (!this.validateInputs()) return;
    if (!this.state.workoutId) return;

    const payload: WorkoutForm = { ...this.state.workout, workoutDate: this.state.workout.workoutDate };
    const context = this.state.drafts.context;
    const language = this.languageService.getCurrentLanguage();
    const unchangedContext = () => this.state.drafts.context === context && this.languageService.getCurrentLanguage() === language;
    this.state.savingWorkout = true;
    this.coachWorkoutsService.updateWorkout(this.state.workoutId, payload, language).pipe(
      takeUntil(this.state.contextCancelled$),
      takeUntilDestroyed(this.destroyRef),
      finalize(() => { this.state.savingWorkout = false; }),
    ).subscribe({
      next: (res) => {
        if (!unchangedContext()) return;
        if (res.success && res.data?.status === 'ok') {
          this.effects.setMessage('coachWorkoutEdit.updateSuccess', 'success');
          timer(1500)
            .pipe(takeUntil(this.state.contextCancelled$), takeUntilDestroyed(this.destroyRef))
            .subscribe(() => {
              if (unchangedContext()) void this.router.navigate(['/coach/workouts']);
            });
        } else {
          this.effects.setMessage(res.data?.message || res.message || 'coachWorkoutEdit.updateError', 'error');
        }
      },
      error: (error) => {
        if (!unchangedContext()) return;
        this.logger.error('Hiba a workout mentésekor:', error);
        const backendMessage = error?.error?.message ?? error?.error?.error ?? error?.message;
        this.effects.setMessage(backendMessage || 'coachWorkoutEdit.saveError', 'error');
      },
    });
  }
}
