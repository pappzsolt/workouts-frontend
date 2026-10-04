import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { LoggerService } from '../../../../../services/logger.service';
import { ActivatedRoute } from '@angular/router';

import { Observable, Subject, combineLatest, distinctUntilChanged, filter, finalize, map, shareReplay, switchMap, takeUntil } from 'rxjs';

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
  private readonly pendingSetSaves = new Map<number, Observable<void>>();

  constructor(
    private route: ActivatedRoute,
    private exercisesService: UserExerciseDetailService,
    private languageService: LanguageService,
  ) {}

  ngOnInit(): void {
    this.workoutId = Number(this.route.snapshot.paramMap.get('workoutId'));

    const queryParams = this.route.snapshot.queryParamMap;

    const programIdParam = queryParams.get('programId');
    const userWorkoutIdParam = queryParams.get('userWorkoutId');
    const programWorkoutIdParam = queryParams.get('programWorkoutId');

    this.programId = Number(programIdParam);
    this.userWorkoutId = Number(userWorkoutIdParam);

    const parsedProgramWorkoutId = Number(programWorkoutIdParam);
    this.programWorkoutId = Number.isFinite(parsedProgramWorkoutId) && parsedProgramWorkoutId > 0
      ? parsedProgramWorkoutId
      : undefined;

    if (!this.userWorkoutId || Number.isNaN(this.userWorkoutId)) {
      this.logger.error('[UserExerciseDetail] Érvénytelen userWorkoutId:', userWorkoutIdParam);
      return;
    }

    combineLatest([
      this.route.paramMap.pipe(
        map((params) => Number(params.get('exerciseId'))),
        filter((exerciseId) => Number.isFinite(exerciseId) && exerciseId > 0),
      ),
      this.languageService.language$,
    ])
      .pipe(
        map(([exerciseId, language]) => ({ exerciseId, language })),
        distinctUntilChanged(
          (previous, current) =>
            previous.exerciseId === current.exerciseId &&
            previous.language === current.language,
        ),
        switchMap(({ exerciseId, language }) => {
          this.currentExerciseId = exerciseId;
          this.currentSetIndex = 0;
          this.message = '';
          this.messageParams = {};
          this.messageType = '';

          return this.exercisesService.getWorkoutExercises(this.userWorkoutId, language).pipe(
            map((response) => ({ response, exerciseId })),
          );
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: ({ response, exerciseId }) => {
          this.applyExerciseDetailResponse(response, exerciseId);
        },
        error: (error: HttpErrorResponse) => {
          this.message =
            this.getBackendErrorMessage(error) ?? 'userExerciseDetail.loadError';
          this.messageType = 'error';
        },
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get currentSet(): UserWorkoutExerciseSetDto | undefined {
    return this.workoutExercise?.userWorkoutExerciseSets?.[this.currentSetIndex];
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
    response: { data?: UserWorkoutDetailDto | null },
    exerciseId: number,
  ): void {
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
    if (!this.workoutExercise) {
      return;
    }

    const exerciseId = this.workoutExercise.exercise.id;

    if (exerciseId == null || set.id == null) {
      this.message = 'userExerciseDetail.invalidSet';
      this.messageType = 'error';
      return;
    }

    this.message = '';
    this.messageParams = {};
    this.messageType = '';

    this.exercisesService
      .updateSetCompleted(
        this.userWorkoutId,
        this.programId,
        this.workoutId,
        exerciseId,
        set.id,
        completed,
        set.actualRepetitions,
        set.actualWeightKg,
        set.notes,
      )
      .subscribe({
        next: () => {
          set.completed = completed;
          this.updateExerciseDone();
          this.message = 'userExerciseDetail.setUpdated';
          this.messageParams = { setNumber: set.setNumber };
          this.messageType = 'success';
        },

        error: (error: HttpErrorResponse) => {
          this.message =
            this.getBackendErrorMessage(error) ?? 'userExerciseDetail.setUpdateError';
          this.messageType = 'error';
        },
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
    this.createSetSaveRequest(set, showSuccessMessage).pipe(takeUntil(this.destroy$)).subscribe();
  }

  private createSetSaveRequest(
    set: UserWorkoutExerciseSetDto,
    showSuccessMessage = true,
  ): Observable<void> {
    if (!this.workoutExercise) {
      return new Observable<void>((subscriber) => subscriber.complete());
    }

    const exerciseId = this.workoutExercise.exercise.id;

    if (exerciseId == null || set.id == null) {
      this.message = 'userExerciseDetail.invalidSet';
      this.messageType = 'error';
      return new Observable<void>((subscriber) => subscriber.complete());
    }

    const existingSave = this.pendingSetSaves.get(set.id);
    if (existingSave) {
      return existingSave;
    }

    this.message = '';
    this.messageParams = {};
    this.messageType = '';

    const request$ = this.exercisesService
      .updateSetCompleted(
        this.userWorkoutId,
        this.programId,
        this.workoutId,
        exerciseId,
        set.id,
        set.completed === true,
        set.actualRepetitions,
        set.actualWeightKg,
        set.notes,
      )
      .pipe(
        map(() => void 0),
        finalize(() => this.pendingSetSaves.delete(set.id!)),
        shareReplay({ bufferSize: 1, refCount: true }),
      );

    this.pendingSetSaves.set(set.id, request$);

    request$.subscribe({
      next: () => {
        this.updateExerciseDone();

        if (showSuccessMessage) {
          this.message = 'userExerciseDetail.saveSuccess';
          this.messageType = 'success';
        }
      },
      error: (error: HttpErrorResponse) => {
        this.message =
          this.getBackendErrorMessage(error) ?? 'userExerciseDetail.saveError';
        this.messageType = 'error';
      },
    });

    return request$;
  }

  goToSet(index: number): void {
    const sets = this.workoutExercise?.userWorkoutExerciseSets;

    if (!sets?.length || index < 0 || index >= sets.length) {
      return;
    }

    if (index === this.currentSetIndex) {
      return;
    }

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
          this.currentSetIndex = index;
        },
        error: () => {
          // Hiba esetén sem veszítjük el a felhasználó navigációját.
          this.currentSetIndex = index;
        },
      });
  }

  private getBackendErrorMessage(error: HttpErrorResponse): string | undefined {
    const body = error.error;

    if (
      typeof body === 'object' &&
      body !== null &&
      'message' in body &&
      typeof body.message === 'string'
    ) {
      return body.message;
    }

    return error.message || undefined;
  }

}
