import { createInputValidationGuard } from '../../../../shared/components/form-controls/app-input.directive';
import { errorMessage, responseMessage } from '../../../../../models/backend-dto/common/api-response-message';
import type { ApiResponse } from '../../../../../models/backend-dto/common/api-response';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { LoggerService } from '../../../../../services/logger.service';
import { ActivatedRoute } from '@angular/router';

import { EMPTY, Observable, Subject, catchError, combineLatest, concatMap, defer, distinctUntilChanged, finalize, map, of, shareReplay, switchMap, takeUntil, tap } from 'rxjs';

import { UserExerciseDetailService } from '../../../../../services/user/user-exercises-detail/user-exercises-detail.service';
import { SidePaginationComponent } from '../../../../../components/shared/components/side-pagination/side-pagination.component';
import { LanguageService } from '../../../../../services/shared/language.service';

import {
  UserWorkoutDetailDto,
  UserWorkoutExerciseSetDto,
} from '../../../../../models/user-workout-exercise-detail.dto';

import { SHARED_IMPORTS } from '../../../../shared/shared-imports';

@Component({
  selector: 'app-user-exercise-detail',
  standalone: true,
  imports: [...SHARED_IMPORTS, SidePaginationComponent],
  templateUrl: './user-exercises-detail.component.html',
  styleUrls: ['./user-exercises-detail.component.css'],
})
export class UserExerciseDetailComponent implements OnInit, OnDestroy {
  private readonly validateInputs = createInputValidationGuard();
  private readonly logger = inject(LoggerService);

  private readonly destroy$ = new Subject<void>();

  workout?: UserWorkoutDetailDto;

  workoutExercise?: UserWorkoutDetailDto['exercises'][number];

  workoutId!: number;
  programId!: number;
  userWorkoutId!: number;
  programWorkoutId?: number;
  private currentExerciseId!: number;
  currentSetIndex = 0;
  imageLoaded = false;
  message = '';
  messageType: 'success' | 'error' | 'info' | '' = '';
  messageParams: Record<string, unknown> = {};

  /**
   * Egy sethez egyszerre csak egy mentési HTTP kérés futhat.
   * Így a blur és a lapozás nem indít párhuzamos mentéseket ugyanarra a setre.
   */
  private readonly pendingSetSaves = new Map<string, {
    signature: string;
    request: Observable<void>;
    confirmed: { completed: boolean };
  }>();

  constructor(
    private route: ActivatedRoute,
    private exercisesService: UserExerciseDetailService,
    private languageService: LanguageService,
  ) {}

  ngOnInit(): void {
    combineLatest([this.route.paramMap, this.route.queryParamMap, this.languageService.language$])
      .pipe(
        map(([params, query, language]) => ({
          workoutId: Number(params.get('workoutId')),
          exerciseId: Number(params.get('exerciseId')),
          programId: Number(query.get('programId')),
          userWorkoutId: Number(query.get('userWorkoutId')),
          programWorkoutId: Number(query.get('programWorkoutId')),
          language,
        })),
        distinctUntilChanged((previous, current) => JSON.stringify(previous) === JSON.stringify(current)),
        switchMap(context => {
          this.workoutId = context.workoutId;
          this.programId = context.programId;
          this.userWorkoutId = context.userWorkoutId;
          this.programWorkoutId = Number.isInteger(context.programWorkoutId) && context.programWorkoutId > 0
            ? context.programWorkoutId : undefined;
          this.currentExerciseId = context.exerciseId;
          this.currentSetIndex = 0;
          this.workout = undefined;
          this.workoutExercise = undefined;
          this.message = '';
          this.messageParams = {};
          this.messageType = '';
          if (![context.workoutId, context.exerciseId, context.programId, context.userWorkoutId]
              .every(id => Number.isInteger(id) && id > 0)) {
            this.message = 'userExerciseDetail.loadError';
            this.messageType = 'error';
            return EMPTY;
          }
          return this.exercisesService.getWorkoutExercises(context.userWorkoutId, context.language).pipe(
            map(response => ({ response, exerciseId: context.exerciseId })),
            catchError(error => {
              this.message = errorMessage(error, 'userExerciseDetail.loadError');
              this.messageType = 'error';
              return EMPTY;
            }),
          );
        }),
        takeUntil(this.destroy$),
      ).subscribe(({ response, exerciseId }) => this.applyExerciseDetailResponse(response, exerciseId));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get currentSet(): UserWorkoutExerciseSetDto | undefined {
    return this.workoutExercise?.userWorkoutExerciseSets?.[this.currentSetIndex];
  }

  get prescribedSetCount(): number {
    return this.workoutExercise?.userWorkoutExerciseSets?.length ?? 0;
  }

  get prescribedRepetitions(): string {
    const repetitions = this.workoutExercise?.userWorkoutExerciseSets
      ?.map(set => set.targetRepetitions ?? '-');
    if (!repetitions?.length) return '-';
    return repetitions.every(value => value === repetitions[0])
      ? String(repetitions[0])
      : repetitions.join(' / ');
  }

  get hasPreviousSet(): boolean {
    return this.currentSetIndex > 0;
  }

  get hasNextSet(): boolean {
    return (
      !!this.workoutExercise?.userWorkoutExerciseSets?.length &&
      this.currentSetIndex < this.workoutExercise.userWorkoutExerciseSets.length - 1
    );
  }

  previousSet(): void {
    if (this.hasPreviousSet) {
      this.currentSetIndex--;
    }
  }

  nextSet(): void {
    if (this.hasNextSet) {
      this.currentSetIndex++;
    }
  }

  /**
   * Workout és exercise adatainak betöltése.
   */
  private applyExerciseDetailResponse(
    response: ApiResponse<UserWorkoutDetailDto>,
    exerciseId: number,
  ): void {
    if (!response.success) {
      this.workout = undefined; this.workoutExercise = undefined;
      this.message = responseMessage([response], 'userExerciseDetail.loadError'); this.messageType = 'error'; return;
    }
    this.message = responseMessage([response], ''); this.messageType = 'info';
    this.workoutExercise = undefined;
    const workout = response.data;

    this.workout = workout ?? undefined;

    if (!workout?.exercises || workout.exercises.length === 0) {
      this.message = 'userExerciseDetail.noExercise';
      this.messageType = 'info';
      return;
    }

    const found = workout.exercises.find((we) => we.exercise.id === exerciseId);

    if (!found) {
      this.message = 'userExerciseDetail.noExercise';
      this.messageType = 'info';
      return;
    }

    this.workoutExercise = found;
    const setCount = found.userWorkoutExerciseSets?.length || 0;
    this.currentSetIndex = setCount > 0 ? Math.min(this.currentSetIndex, setCount - 1) : 0;
    this.updateExerciseDone();
  }

  /**
   * Egy set completed állapotának módosítása.
   */
  onSetCompletedChange(set: UserWorkoutExerciseSetDto, event: Event): void {
    const input = event.target as HTMLInputElement;
    this.updateSetCompleted(set, input.checked);
  }

  /**
   * Egy konkrét set completed állapotának
   * és aktuális adatainak frissítése a backendben.
   */
  updateSetCompleted(set: UserWorkoutExerciseSetDto, completed: boolean): void {
    this.createSetSaveRequest(set, true, completed).pipe(takeUntil(this.destroy$)).subscribe({
      error: () => { /* The shared save reports the failure. */ },
    });
  }

  /**
   * Az exercise akkor completed,
   * ha az összes saját set completed = true.
   */
  updateExerciseDone(): void {
    if (!this.workoutExercise) {
      return;
    }

    const sets: UserWorkoutExerciseSetDto[] = this.workoutExercise.userWorkoutExerciseSets;

    if (!sets || sets.length === 0) {
      this.workoutExercise.done = false;
      this.updateWorkoutDone();
      return;
    }

    this.workoutExercise.done = sets.every(
      (set: UserWorkoutExerciseSetDto) => set.completed === true,
    );

    this.updateWorkoutDone();
  }

  /**
   * A workout akkor completed,
   * ha az összes exercise completed.
   *
   * A tényleges workout completed állapotot
   * a backend kezeli és a USER_WORKOUTS táblában
   * tárolja.
   *
   * Ez a metódus csak a jelenlegi frontend
   * állapotot számolja újra.
   */
  updateWorkoutDone(): void {
    if (!this.workout) {
      return;
    }

    if (!this.workout.exercises?.length) {
      this.workout.done = false;
      return;
    }

    this.workout.done = this.workout.exercises.every((exercise) => exercise.done === true);
  }

  /**
   * Egy konkrét set tényleges adatainak mentése.
   *
   * A backend ugyanazt a /set-completed endpointot
   * használja az összes set adat mentésére.
   */
  saveSetDetails(set: UserWorkoutExerciseSetDto, showSuccessMessage = true): void {
    this.createSetSaveRequest(set, showSuccessMessage).pipe(takeUntil(this.destroy$)).subscribe({
      error: () => { /* The shared request reports the failure through MessageComponent. */ },
    });
  }

  private createSetSaveRequest(
    set: UserWorkoutExerciseSetDto,
    showSuccessMessage = true,
    completed?: boolean,
  ): Observable<void> {
    if (!this.validateInputs(`input[data-validation-set="${set.id}"]`)) return EMPTY;
    const exercise = this.workoutExercise;
    const exerciseId = exercise?.exercise.id;
    if (!exercise || exerciseId == null || set.id == null) {
      this.message = 'userExerciseDetail.invalidSet';
      this.messageType = 'error';
      return EMPTY;
    }

    // Capture the occurrence and values at the time of the edit. A queued save
    // must never use identifiers from a different route or later form values.
    const args = [this.userWorkoutId, this.programId, this.workoutId, exerciseId, set.id,
      completed ?? (set.completed === true), set.actualRepetitions, set.actualWeightKg, set.notes] as const;
    const key = `${this.userWorkoutId}:${set.id}`;
    const signature = JSON.stringify(args);
    const previous = this.pendingSetSaves.get(key);
    if (previous?.signature === signature) return previous.request;
    const confirmed = previous?.confirmed ?? { completed: set.completed === true };
    if (completed !== undefined) set.completed = completed;
    const isCurrent = (): boolean => this.workoutExercise === exercise && this.userWorkoutId === args[0];
    this.message = '';
    this.messageParams = {};
    this.messageType = '';

    const entry = { signature, confirmed, request: EMPTY as Observable<void> };
    // Changed payloads queue behind the existing request; identical blur/page
    // saves share it. Recover an earlier failure so a newer edit can still save.
    entry.request = (previous ? previous.request.pipe(catchError(() => of(void 0))) : of(void 0)).pipe(
      concatMap(() => defer(() => this.exercisesService.updateSetCompleted(...args))),
      map(response => {
        if (!response.success) throw new Error(responseMessage([response], 'userExerciseDetail.saveError'));
        confirmed.completed = args[5];
        if (isCurrent()) {
          this.updateExerciseDone();
          if (showSuccessMessage || response.message) {
            this.message = responseMessage([response], completed === undefined
              ? 'userExerciseDetail.saveSuccess' : 'userExerciseDetail.setUpdated');
            this.messageParams = completed !== undefined && !response.message ? { setNumber: set.setNumber } : {};
            this.messageType = 'success';
          }
        }
        return void 0;
      }),
      tap({ error: error => {
        if (isCurrent() && this.pendingSetSaves.get(key) === entry) {
          set.completed = confirmed.completed;
          this.updateExerciseDone();
          this.message = errorMessage(error, completed === undefined
            ? 'userExerciseDetail.saveError' : 'userExerciseDetail.setUpdateError');
          this.messageType = 'error';
        }
      } }),
      finalize(() => {
        if (this.pendingSetSaves.get(key) === entry) this.pendingSetSaves.delete(key);
      }),
      shareReplay({ bufferSize: 1, refCount: true }),
    );
    this.pendingSetSaves.set(key, entry);
    return entry.request;
  }

  goToSet(index: number): void {
    const sets = this.workoutExercise?.userWorkoutExerciseSets;

    if (!sets?.length || index < 0 || index >= sets.length) {
      return;
    }

    if (index === this.currentSetIndex) {
      return;
    }

    const exercise = this.workoutExercise;
    const userWorkoutId = this.userWorkoutId;
    const currentSet = sets[this.currentSetIndex];

    if (!currentSet) {
      this.currentSetIndex = index;
      return;
    }

    // Lapozáskor megvárjuk az aktuális set mentését.
    // Ha blur már elindította, ugyanazt a folyamatban lévő requestet használjuk.
    this.createSetSaveRequest(currentSet, false)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          if (this.workoutExercise === exercise && this.userWorkoutId === userWorkoutId) this.currentSetIndex = index;
        },
        error: () => {
          if (this.workoutExercise === exercise && this.userWorkoutId === userWorkoutId) this.currentSetIndex = index;
        },
      });
  }

}
