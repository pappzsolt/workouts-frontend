import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_ENDPOINTS } from '../../api-endpoints';
import { ApiResponse } from '../../models/backend-dto/common/api-response';

export type ImportScope = 'coach' | 'personal';
export interface ImportRequest {
  file: File;
  userId: number | null;
  programName: string;
  startDate: string;
  language: string;
  exerciseMappings: Record<string, number>;
}
export interface ImportIssue { name: string; candidateIds: number[]; }
export interface ImportResult {
  programId: number | null;
  programName: string;
  startDate: string;
  endDate: string;
  workouts: number;
  exercises: number;
  sets: number;
  warnings: string[];
  unresolvedExercises: ImportIssue[];
}

@Injectable({ providedIn: 'root' })
export class ProgramImportService {
  private readonly http = inject(HttpClient);

  preview(scope: ImportScope, request: ImportRequest): Observable<ImportResult> {
    return this.send(scope, request, true);
  }
  import(scope: ImportScope, request: ImportRequest): Observable<ImportResult> {
    return this.send(scope, request, false);
  }
  private send(scope: ImportScope, request: ImportRequest, preview: boolean): Observable<ImportResult> {
    const body = new FormData();
    body.append('file', request.file, request.file.name);
    if (scope === 'coach' && request.userId !== null) body.append('userId', String(request.userId));
    if (request.programName.trim()) body.append('programName', request.programName.trim());
    if (request.startDate) body.append('startDate', request.startDate);
    if (Object.keys(request.exerciseMappings).length) {
      body.append('exerciseMappings', new Blob([JSON.stringify(request.exerciseMappings)], { type: 'application/json' }));
    }
    const url = scope === 'coach' ? API_ENDPOINTS.programImport : API_ENDPOINTS.personalProgramImport;
    // Keep this explicit: LanguageInterceptor must not override the previewed language.
    const params = new HttpParams().set('language', request.language);
    return this.http.post<ApiResponse<ImportResult>>(url + (preview ? '/preview' : ''), body, { params }).pipe(
      map(response => {
        if (!response.success || !response.data) throw new Error(response.message || 'excelImport.failed');
        return response.data;
      }),
    );
  }
}
