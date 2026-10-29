import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_ENDPOINTS } from '../../api-endpoints';
import type { ApiResponse } from '../../models/backend-dto/common/api-response';
import { LanguageService } from '../shared/language.service';
import { unwrap } from './coach-api-response';
import type { CoachApplyTemplateResult, CoachProgramUsage, CoachWorkoutSummary } from '../../models/coach-workspace.model';
import { WorkoutExerciseService } from './workout-exercises.service';

/** HTTP operations for coach workouts. */
@Injectable({ providedIn: 'root' })
export class CoachWorkoutTemplatesApiService {
  private readonly http = inject(HttpClient);
  private readonly languageService = inject(LanguageService);
  private readonly workoutExercises = inject(WorkoutExerciseService);

  private language(): string {
    return this.languageService.getCurrentLanguage();
  }

  copyWorkoutToDay(
    sourceWorkoutId: number,
    programId: number,
    workoutName: string,
    workoutDate: string,
    dayIndex: number,
  ): Observable<number> {
    const params = new HttpParams().set('language', this.language());
    return this.http
      .post<ApiResponse<number>>(
        API_ENDPOINTS.workoutCopy,
        { sourceWorkoutId, programId, workoutName, workoutDate, dayIndex },
        { params },
      )
      .pipe(map(unwrap));
  }

  createWorkout(name: string, workoutDate: string): Observable<number> {
    const params = new HttpParams().set('language', this.language());
    return this.http
      .post<ApiResponse<{ id: number }>>(
        API_ENDPOINTS.workoutAdd,
        { name, workoutDate },
        { params },
      )
      .pipe(map((response) => unwrap(response).id));
  }

  getMyWorkouts(): Observable<CoachWorkoutSummary[]> {
    const params = new HttpParams().set('language', this.language());
    return this.http
      .get<ApiResponse<CoachWorkoutSummary[]>>(API_ENDPOINTS.myWorkouts, { params })
      .pipe(map((response) => (unwrap(response) ?? []).map((w) => ({
        id: w.id,
        name: w.name,
        description: w.description ?? null,
      }))));
  }

  addExerciseToWorkout(workoutId: number, exerciseId: number): Observable<void> {
    const params = new HttpParams().set('workoutId', workoutId).set('exerciseId', exerciseId);
    return this.http
      .post<ApiResponse<void>>(API_ENDPOINTS.workoutExerciseAssign, null, { params })
      .pipe(map(unwrap));
  }

  updatePrescription(
    workoutId: number,
    exerciseId: number,
    values: { sets: number; repetitions: number; restSeconds: number },
  ): Observable<void> {
    const params = new HttpParams().set('workoutId', workoutId).set('exerciseId', exerciseId);
    return this.http
      .put<ApiResponse<void>>(API_ENDPOINTS.workoutExercisePrescription, values, { params })
      .pipe(map(unwrap));
  }

  copyWorkout(workoutId: number, name: string): Observable<number> {
    const params = new HttpParams().set('language', this.language());
    return this.http
      .post<ApiResponse<number>>(API_ENDPOINTS.coachWorkoutCopy(workoutId), { name }, { params })
      .pipe(map(unwrap));
  }

  applyTemplate(workoutId: number): Observable<CoachApplyTemplateResult> {
    return this.http
      .post<ApiResponse<CoachApplyTemplateResult>>(API_ENDPOINTS.coachWorkoutApplyTemplate(workoutId), {})
      .pipe(map(unwrap));
  }

  programsUsingWorkout(workoutId: number): Observable<CoachProgramUsage[]> {
    const params = new HttpParams().set('language', this.language());
    return this.http
      .get<ApiResponse<CoachProgramUsage[]>>(API_ENDPOINTS.coachWorkoutPrograms(workoutId), { params })
      .pipe(map((response) => unwrap(response) ?? []));
  }

  moveTemplateExercise(workoutId: number, exerciseId: number, orderIndex: number): Observable<void> {
    return this.workoutExercises.updateOrderIndex(workoutId, exerciseId, orderIndex)
      .pipe(map(unwrap));
  }
}

