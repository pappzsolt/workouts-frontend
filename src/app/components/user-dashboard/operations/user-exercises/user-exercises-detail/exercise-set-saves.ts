import { Injectable } from '@angular/core';
import { EMPTY, Observable, Subject, catchError, concatMap, defer, filter, finalize, map, of, shareReplay, take, tap, throwError } from 'rxjs';
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

interface PendingSetSave {
  userWorkoutId: number;
  signature: string;
  request: Observable<void>;
  confirmed: { completed: boolean; timerNeedsRefresh: boolean };
}

interface FailedSetSave {
  exerciseId: number;
  set: UserWorkoutExerciseSetDto;
  message: string;
  retryCompletion?: boolean;
}

class ExerciseSetSaveSession {
  readonly failedSetSaves = new Map<string, FailedSetSave>();
  readonly settled$ = new Subject<number>();
  readonly pendingSetSaves = new Map<string, PendingSetSave>();
}

/** Keeps pending writes and failed edits available when an exercise detail is reopened. */
@Injectable({ providedIn: 'root' })
export class ExerciseSetSaveStore {
  private version?: number;
  private session = new ExerciseSetSaveSession();

  forSession(version: number): ExerciseSetSaveSession {
    if (version !== this.version) {
      this.version = version;
      this.session = new ExerciseSetSaveSession();
    }
    return this.session;
  }
}

/** Per-occurrence save queue, request deduplication and confirmed completion state. */
export class ExerciseSetSaves {
  private readonly confirmedValues = new WeakMap<UserWorkoutExerciseSetDto, string>();
  constructor(
    private readonly service: UserExerciseDetailService,
    private readonly effects: ExerciseSetSaveEffects,
    private readonly session = new ExerciseSetSaveSession(),
    private readonly isCurrentSession = () => true,
  ) {}

  waitForOccurrence(userWorkoutId: number): Observable<void> {
    const hasPending = () => [...this.session.pendingSetSaves.values()].some(entry => entry.userWorkoutId === userWorkoutId);
    return defer(() => hasPending()
      ? this.session.settled$.pipe(filter(id => id === userWorkoutId && !hasPending()), take(1), map(() => void 0))
      : of(void 0));
  }

  restoreFailedEdits(userWorkoutId: number, exercise: UserWorkoutDetailDto['exercises'][number]): void {
    let message: string | undefined;
    for (const set of exercise.userWorkoutExerciseSets ?? []) {
      this.confirmedValues.set(set, this.valuesSignature(set));
      const failed = this.session.failedSetSaves.get(this.setKey(userWorkoutId, set.id));
      if (!failed || failed.exerciseId !== exercise.exercise.id) continue;
      const draft = failed.set;
      set.actualRepetitions = draft.actualRepetitions;
      set.actualWeightKg = draft.actualWeightKg;
      set.notes = draft.notes;
      if ('actualRpe' in draft) set.actualRpe = draft.actualRpe;
      if ('rir' in draft) set.rir = draft.rir;
      failed.set = set;
      message = failed.message;
    }
    if (message) this.effects.showError(message);
  }

  isSettled(userWorkoutId: number, setId: number | null | undefined): boolean {
    const key = this.setKey(userWorkoutId, setId);
    return !this.session.pendingSetSaves.has(key) && !this.session.failedSetSaves.has(key);
  }

  isSaving(set: UserWorkoutExerciseSetDto): boolean {
    return this.session.pendingSetSaves.has(this.setKey(this.effects.context().userWorkoutId, set.id));
  }

  failedSave(set: UserWorkoutExerciseSetDto): FailedSetSave | undefined {
    return this.session.failedSetSaves.get(this.setKey(this.effects.context().userWorkoutId, set.id));
  }

  saveBeforeNavigation(set: UserWorkoutExerciseSetDto): Observable<void> {
    const key = this.setKey(this.effects.context().userWorkoutId, set.id);
    const request = this.createRequest(set, false);
    const entry = this.session.pendingSetSaves.get(key);
    return request === EMPTY || !entry ? request : this.waitForLatest(key, entry);
  }

  private waitForLatest(key: string, entry: PendingSetSave): Observable<void> {
    return entry.request.pipe(
      map(() => true),
      catchError(() => of(false)),
      concatMap(success => {
        const latest = this.session.pendingSetSaves.get(key);
        if (latest && latest !== entry) return this.waitForLatest(key, latest);
        return success ? of(void 0) : EMPTY;
      }),
    );
  }

  private setKey(userWorkoutId: number, setId: number | null | undefined): string {
    return `${userWorkoutId}:${setId}`;
  }

  private valuesSignature(set: UserWorkoutExerciseSetDto, completed = set.completed === true): string {
    return JSON.stringify([completed, set.actualRepetitions, set.actualWeightKg, set.notes, set.actualRpe, set.rir]);
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
    const key = this.setKey(context.userWorkoutId, set.id);
    const signature = JSON.stringify(args);
    const previous = this.session.pendingSetSaves.get(key);
    if (previous?.signature === signature) return previous.request;
    const failed = this.session.failedSetSaves.get(key);
    const values = this.valuesSignature(set, completed);
    if (!previous && !failed && this.confirmedValues.get(set) === values) {
      return of(void 0);
    }
    const confirmed = previous?.confirmed ?? { completed: set.completed === true, timerNeedsRefresh: false };
    if (completed !== undefined) set.completed = completed;
    const isCurrent = (): boolean => {
      const current = this.effects.context();
      return this.isCurrentSession() && !this.effects.isDestroyed()
        && current.workoutExercise === exercise && current.userWorkoutId === args[0];
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
    const entry: PendingSetSave = { userWorkoutId: args[0], signature, confirmed, request: EMPTY };
    let succeeded = false;
    // Changed payloads queue behind the existing request; identical blur/page
    // saves share it. Recover an earlier failure so a newer edit can still save.
    entry.request = (previous ? previous.request.pipe(catchError(() => of(void 0))) : of(void 0)).pipe(
      concatMap(() => defer(() => {
        if (!this.isCurrentSession()) return throwError(() => new Error('authErrors.sessionEnded'));
        return hasEffort
          ? this.service.updateSetCompleted(...originalArgs, ...effortArgs)
          : this.service.updateSetCompleted(...originalArgs);
      })),
      map(response => {
        if (!response.success) throw new Error(responseMessage([response], 'userExerciseDetail.saveError'));
        if (completed !== undefined || confirmed.completed !== args[5]) confirmed.timerNeedsRefresh = true;
        confirmed.completed = args[5];
        this.confirmedValues.set(set, values);
        // An older queued response must not replace newer pending UI state.
        const isLatestSave = this.session.pendingSetSaves.get(key) === entry;
        if (isLatestSave) {
          succeeded = true;
          if (completed !== undefined || failed?.retryCompletion === undefined) this.session.failedSetSaves.delete(key);
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
        if (this.session.pendingSetSaves.get(key) !== entry || !this.isCurrentSession()) return;
        const message = errorMessage(error, completed === undefined
          ? 'userExerciseDetail.saveError' : 'userExerciseDetail.setUpdateError');
        const retryCompletion = args[5] !== confirmed.completed ? args[5] : failed?.retryCompletion;
        this.session.failedSetSaves.set(key, { exerciseId, set, message, retryCompletion });
        if (!isCurrent()) return;
        set.completed = confirmed.completed;
        syncConfirmedTimer();
        this.effects.updateExerciseDone();
        this.effects.showError(message);
      } }),
      finalize(() => {
        if (this.session.pendingSetSaves.get(key) === entry) {
          this.session.pendingSetSaves.delete(key);
          if (succeeded && isCurrent()) this.effects.onSettled();
          this.session.settled$.next(entry.userWorkoutId);
        }
      }),
      // Navigation only detaches UI observers. Keep the finite HTTP save and
      // any queued edits alive until they finish, even after component teardown.
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    this.session.pendingSetSaves.set(key, entry);
    return entry.request;
  }
}
