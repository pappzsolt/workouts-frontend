import { EMPTY, Observable, catchError, concatMap, defer, finalize, map, of, shareReplay, tap } from 'rxjs';
import { errorMessage, responseMessage } from '../../../../../models/backend-dto/common/api-response-message';
import type { UserWorkoutDetailDto, UserWorkoutExerciseSetDto } from '../../../../../models/user-workout-exercise-detail.dto';
import type { UserExerciseDetailService } from '../../../../../services/user/user-exercises-detail/user-exercises-detail.service';

export interface ExerciseSetSaveEffects {
  context(): {
    userWorkoutId: number;
    programId: number;
    workoutId: number;
    workoutExercise?: UserWorkoutDetailDto['exercises'][number];
  };
  validateInputs(selector: string): boolean;
  clearMessage(): void;
  showSuccess(message: string, params: Record<string, unknown>): void;
  showError(message: string): void;
  selectLastCompletedTimer(setId?: number): void;
  updateExerciseDone(): void;
  isDestroyed(): boolean;
  onSettled(): void;
}

/** Per-occurrence save queue, request deduplication and confirmed completion state. */
export class ExerciseSetSaves {
  private readonly failedSetSaves = new Set<string>();
  private readonly pendingSetSaves = new Map<string, {
    signature: string;
    request: Observable<void>;
    confirmed: { completed: boolean; timerNeedsRefresh: boolean };
  }>();

  constructor(
    private readonly service: UserExerciseDetailService,
    private readonly effects: ExerciseSetSaveEffects,
  ) {}

  isSettled(userWorkoutId: number, setId: number | null | undefined): boolean {
    const key = `${userWorkoutId}:${setId}`;
    return !this.pendingSetSaves.has(key) && !this.failedSetSaves.has(key);
  }

  createRequest(
    set: UserWorkoutExerciseSetDto,
    showSuccessMessage = true,
    completed?: boolean,
  ): Observable<void> {
    if (!this.effects.validateInputs(`input[data-validation-set="${set.id}"]`)) return EMPTY;
    const context = this.effects.context();
    const exercise = context.workoutExercise;
    const exerciseId = exercise?.exercise.id;
    if (!exercise || exerciseId == null || set.id == null) {
      this.effects.showError('userExerciseDetail.invalidSet');
      return EMPTY;
    }

    // Capture the occurrence and values at the time of the edit. A queued save
    // must never use identifiers from a different route or later form values.
    const originalArgs = [context.userWorkoutId, context.programId, context.workoutId, exerciseId, set.id,
      completed ?? (set.completed === true), set.actualRepetitions, set.actualWeightKg, set.notes] as const;
    const hasEffort = 'actualRpe' in set || 'rir' in set;
    const effortArgs = [set.actualRpe, set.rir] as const;
    const args = hasEffort ? [...originalArgs, ...effortArgs] as const : originalArgs;
    const key = `${context.userWorkoutId}:${set.id}`;
    const signature = JSON.stringify(args);
    const previous = this.pendingSetSaves.get(key);
    if (previous?.signature === signature) return previous.request;
    const confirmed = previous?.confirmed ?? { completed: set.completed === true, timerNeedsRefresh: false };
    if (completed !== undefined) set.completed = completed;
    const isCurrent = (): boolean => {
      const current = this.effects.context();
      return current.workoutExercise === exercise && current.userWorkoutId === args[0];
    };
    // Blur saves must not move the form while the user clicks another control.
    // They report failures, but leave feedback changes to explicit actions.
    if (showSuccessMessage) this.effects.clearMessage();

    const syncConfirmedTimer = () => {
      if (isCurrent() && confirmed.timerNeedsRefresh) {
        this.effects.selectLastCompletedTimer(confirmed.completed ? set.id ?? undefined : undefined);
        confirmed.timerNeedsRefresh = false;
      }
    };
    const entry = { signature, confirmed, request: EMPTY as Observable<void> };
    let succeeded = false;
    // Changed payloads queue behind the existing request; identical blur/page
    // saves share it. Recover an earlier failure so a newer edit can still save.
    entry.request = (previous ? previous.request.pipe(catchError(() => of(void 0))) : of(void 0)).pipe(
      concatMap(() => defer(() => hasEffort
        ? this.service.updateSetCompleted(...originalArgs, ...effortArgs)
        : this.service.updateSetCompleted(...originalArgs))),
      map(response => {
        if (!response.success) throw new Error(responseMessage([response], 'userExerciseDetail.saveError'));
        if (completed !== undefined || confirmed.completed !== args[5]) confirmed.timerNeedsRefresh = true;
        confirmed.completed = args[5];
        // An older queued response must not replace newer pending UI state.
        const isLatestSave = this.pendingSetSaves.get(key) === entry;
        if (isLatestSave) {
          succeeded = true;
          this.failedSetSaves.delete(key);
          syncConfirmedTimer();
        }
        if (isCurrent()) {
          this.effects.updateExerciseDone();
          if (isLatestSave && showSuccessMessage) {
            this.effects.showSuccess(
              responseMessage([response], completed === undefined
                ? 'userExerciseDetail.saveSuccess' : 'userExerciseDetail.setUpdated'),
              completed !== undefined && !response.message ? { setNumber: set.setNumber } : {},
            );
          }
        }
        return void 0;
      }),
      tap({ error: error => {
        if (isCurrent() && this.pendingSetSaves.get(key) === entry) {
          this.failedSetSaves.add(key);
          set.completed = confirmed.completed;
          syncConfirmedTimer();
          this.effects.updateExerciseDone();
          this.effects.showError(errorMessage(error, completed === undefined
            ? 'userExerciseDetail.saveError' : 'userExerciseDetail.setUpdateError'));
        }
      } }),
      finalize(() => {
        if (this.pendingSetSaves.get(key) === entry) {
          this.pendingSetSaves.delete(key);
          if (succeeded && isCurrent() && !this.effects.isDestroyed()) this.effects.onSettled();
        }
      }),
      // Navigation only detaches UI observers. Keep the finite HTTP save and
      // any queued edits alive until they finish, even after component teardown.
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    this.pendingSetSaves.set(key, entry);
    return entry.request;
  }
}
