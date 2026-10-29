import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_ENDPOINTS } from '../../api-endpoints';
import type { ApiResponse } from '../../models/backend-dto/common/api-response';
import { LanguageService } from '../shared/language.service';
import { unwrap } from './coach-api-response';
import type { CoachProgram, CoachProgramDayLink, CoachProgramDetailsInput } from '../../models/coach-workspace.model';

/** HTTP operations for coach programs. */
@Injectable({ providedIn: 'root' })
export class CoachProgramsApiService {
  private readonly http = inject(HttpClient);
  private readonly languageService = inject(LanguageService);

  private language(): string {
    return this.languageService.getCurrentLanguage();
  }

  assignProgram(userId: number, programId: number): Observable<string | null> {
    return this.http
      .post<ApiResponse<void>>(API_ENDPOINTS.assignProgram, { userId, programId })
      .pipe(map((response) => {
        unwrap(response);
        return response.message ?? null;
      }));
  }

  revokeProgram(programId: number, userId: number): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(API_ENDPOINTS.programAssignmentRevoke(programId, userId))
      .pipe(map(unwrap));
  }

  getAssignedUserIds(programId: number): Observable<number[]> {
    return this.http
      .get<ApiResponse<number[]>>(API_ENDPOINTS.programAssignedUsers(programId))
      .pipe(map((response) => unwrap(response) ?? []));
  }

  getCoachPrograms(): Observable<CoachProgram[]> {
    const params = new HttpParams().set('language', this.language());
    return this.http
      .get<ApiResponse<CoachProgram[]>>(API_ENDPOINTS.coachProgramsWithWorkouts, { params })
      .pipe(map((response) => unwrap(response) ?? []));
  }

  getProgram(programId: number): Observable<CoachProgram> {
    const params = new HttpParams().set('language', this.language());
    return this.http
      .get<ApiResponse<CoachProgram>>(API_ENDPOINTS.programById(programId), { params })
      .pipe(map(unwrap));
  }

  createProgram(details: CoachProgramDetailsInput): Observable<number> {
    return this.http
      .post<ApiResponse<number>>(API_ENDPOINTS.createProgram, {
        ...details,
        languageCode: this.language(),
        workouts: [],
      })
      .pipe(map(unwrap));
  }

  updateProgram(programId: number, details: CoachProgramDetailsInput): Observable<void> {
    const params = new HttpParams().set('language', this.language());
    return this.http
      .put<ApiResponse<unknown>>(API_ENDPOINTS.programById(programId), details, { params })
      .pipe(map((response) => { unwrap(response); }));
  }

  deleteProgram(programId: number): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(API_ENDPOINTS.coachProgramDelete(programId))
      .pipe(map(unwrap));
  }

  getProgramDays(programId: number): Observable<CoachProgramDayLink[]> {
    return this.http
      .get<ApiResponse<CoachProgramDayLink[]>>(API_ENDPOINTS.programWorkoutsByProgram(programId))
      .pipe(map((response) => unwrap(response) ?? []));
  }

  addWorkoutToDay(programId: number, workoutId: number, dayIndex: number): Observable<void> {
    return this.http
      .post<ApiResponse<unknown>>(API_ENDPOINTS.programWorkoutAdd, { programId, workoutId, dayIndex })
      .pipe(map((response) => { unwrap(response); }));
  }

  moveWorkoutToDay(programWorkoutId: number, dayIndex: number): Observable<void> {
    return this.http
      .put<ApiResponse<unknown>>(API_ENDPOINTS.programWorkoutUpdate(programWorkoutId), {
        id: programWorkoutId,
        dayIndex,
      })
      .pipe(map((response) => { unwrap(response); }));
  }

  removeWorkoutFromDay(programWorkoutId: number): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(API_ENDPOINTS.programWorkoutDeleteById(programWorkoutId))
      .pipe(map(unwrap));
  }

  copyProgram(programId: number, name: string, startDate: string, userId: number | null): Observable<number> {
    const params = new HttpParams().set('language', this.language());
    return this.http
      .post<ApiResponse<number>>(API_ENDPOINTS.coachProgramCopy(programId), { name, startDate, userId }, { params })
      .pipe(map(unwrap));
  }

  assignmentCounts(): Observable<Record<number, number>> {
    return this.http
      .get<ApiResponse<Record<number, number>>>(API_ENDPOINTS.coachProgramAssignmentCounts)
      .pipe(map((response) => unwrap(response) ?? {}));
  }
}

