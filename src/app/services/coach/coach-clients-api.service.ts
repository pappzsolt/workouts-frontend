import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_ENDPOINTS } from '../../api-endpoints';
import type { ApiResponse } from '../../models/backend-dto/common/api-response';
import { LanguageService } from '../shared/language.service';
import { unwrap } from './coach-api-response';
import type { ClientProgramRow, ClientSetValues, ClientWorkoutExerciseRow, ClientWorkoutSet, CoachOverview } from '../../models/coach-workspace.model';
import { ProgramExportService } from '../shared/program-export.service';

/** HTTP operations for coach clients. */
@Injectable({ providedIn: 'root' })
export class CoachClientsApiService {
  private readonly http = inject(HttpClient);
  private readonly languageService = inject(LanguageService);
  private readonly programExport = inject(ProgramExportService);

  private language(): string {
    return this.languageService.getCurrentLanguage();
  }

  getOverview(from: string, to: string, userId?: number): Observable<CoachOverview> {
    let params = new HttpParams().set('from', from).set('to', to).set('language', this.language());
    if (userId) params = params.set('userId', userId);
    return this.http
      .get<ApiResponse<CoachOverview>>(API_ENDPOINTS.coachOverview, { params })
      .pipe(map(unwrap));
  }

  rescheduleWorkout(userWorkoutId: number, scheduledAt: string): Observable<void> {
    return this.http
      .patch<ApiResponse<void>>(API_ENDPOINTS.rescheduleUserWorkout, { userWorkoutId, scheduledAt })
      .pipe(map(unwrap));
  }

  getClientWorkoutExercises(userWorkoutId: number): Observable<ClientWorkoutExerciseRow[]> {
    const params = new HttpParams().set('language', this.language());
    return this.http
      .get<ApiResponse<ClientWorkoutExerciseRow[]>>(
        API_ENDPOINTS.userWorkoutExerciseByWorkout(userWorkoutId),
        { params },
      )
      .pipe(map((response) => unwrap(response) ?? []));
  }

  getClientWorkoutSets(userWorkoutExerciseId: number): Observable<ClientWorkoutSet[]> {
    return this.http
      .get<ApiResponse<ClientWorkoutSet[]>>(
        API_ENDPOINTS.userWorkoutExerciseSetsByExercise(userWorkoutExerciseId),
      )
      .pipe(map((response) => unwrap(response) ?? []));
  }

  updateClientSet(
    setId: number,
    values: { targetRepetitions: number; targetWeightKg: number | null; restSeconds: number },
  ): Observable<void> {
    const body = {
      targetRepetitions: values.targetRepetitions,
      targetWeightKg: values.targetWeightKg,
      clearTargetWeightKg: values.targetWeightKg === null,
      restSeconds: values.restSeconds,
    };
    return this.http
      .put<ApiResponse<void>>(API_ENDPOINTS.userWorkoutExerciseSetById(setId), body)
      .pipe(map(unwrap));
  }

  addClientSet(userWorkoutExerciseId: number): Observable<number> {
    return this.http
      .post<ApiResponse<number>>(API_ENDPOINTS.addUserWorkoutExerciseSet(userWorkoutExerciseId), {})
      .pipe(map(unwrap));
  }

  deleteClientSet(setId: number): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(API_ENDPOINTS.userWorkoutExerciseSetById(setId))
      .pipe(map(unwrap));
  }

  getClientProgramRows(userId: number, programId: number): Observable<ClientProgramRow[]> {
    const params = new HttpParams().set('language', this.language());
    return this.http
      .get<ApiResponse<ClientProgramRow[]>>(API_ENDPOINTS.userWorkoutExercisesByUserProgram(userId, programId), { params })
      .pipe(map((response) => unwrap(response) ?? []));
  }

  exportClientProgram(userId: number, programId: number): Observable<Blob> {
    return this.programExport.exportUserProgram(userId, programId);
  }

  saveClientSet(setId: number, values: ClientSetValues, expected?: ClientSetValues): Observable<void> {
    const body = {
      ...(expected ? { expected } : {}),
      ...(values.targetRpe !== undefined ? {
        targetRpe: values.targetRpe,
        clearTargetRpe: values.targetRpe === null,
      } : {}),
      targetRepetitions: values.targetRepetitions,
      targetWeightKg: values.targetWeightKg,
      clearTargetWeightKg: values.targetWeightKg === null,
      actualRepetitions: values.actualRepetitions,
      clearActualRepetitions: values.actualRepetitions === null,
      actualWeightKg: values.actualWeightKg,
      clearActualWeightKg: values.actualWeightKg === null,
      restSeconds: values.restSeconds,
      clearRestSeconds: values.restSeconds === null,
      notes: values.notes,
      clearNotes: values.notes === null,
      completed: values.completed,
    };
    return this.http
      .put<ApiResponse<void>>(API_ENDPOINTS.userWorkoutExerciseSetById(setId), body)
      .pipe(map(unwrap));
  }
}

