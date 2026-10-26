import { PageResponse } from '../../models/backend-dto/common/page-response';
import type { WorkoutTemplate } from '../../models/workout-template.model';
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_ENDPOINTS } from '../../api-endpoints';
import { ApiResponse } from '../../models/backend-dto/common/api-response';
import {
  PersonalProgramDetail,
  PersonalProgramRequest,
  PersonalProgramSummary,
} from '../../models/personal-program.model';
import { LanguageService } from '../shared/language.service';

@Injectable({ providedIn: 'root' })
export class PersonalProgramService {
  private readonly http = inject(HttpClient);
  private readonly language = inject(LanguageService);
  private readonly url = API_ENDPOINTS.personalPrograms;
  private params(): HttpParams {
    return new HttpParams().set('languageCode', this.language.getCurrentLanguage());
  }
  private unwrap<T>(response: ApiResponse<T>): T {
    if (!response.success || response.data == null)
      throw new Error(response.message || 'personalPrograms.actionError');
    return response.data;
  }
  list() {
    return this.http
      .get<ApiResponse<PersonalProgramSummary[]>>(this.url, { params: this.params() })
      .pipe(map((response) => this.unwrap(response)));
  }
  listPage(page = 0, size = 12, standalone: boolean | null = null, search = '') {
    let params = this.params().set('page', page).set('size', size).set('search', search);
    if (standalone != null) params = params.set('standalone', standalone);
    return this.http.get<ApiResponse<PageResponse<PersonalProgramSummary>>>(`${this.url}/page`, { params })
      .pipe(map((response) => this.unwrap(response)));
  }
  get(id: number) {
    return this.http
      .get<ApiResponse<PersonalProgramDetail>>(`${this.url}/${id}`, { params: this.params() })
      .pipe(map((response) => this.unwrap(response)));
  }
  save(
    id: number | null,
    request: PersonalProgramRequest,
    standalone = false,
  ): Observable<number | PersonalProgramDetail> {
    if (id == null)
      return this.http
        .post<ApiResponse<number>>(standalone ? `${this.url}/standalone` : this.url, request)
        .pipe(map((response) => this.unwrap(response)));
    return this.http
      .put<ApiResponse<PersonalProgramDetail>>(`${this.url}/${id}`, request)
      .pipe(map((response) => this.unwrap(response)));
  }
  start(id: number) {
    return this.http
      .post<ApiResponse<PersonalProgramDetail>>(`${this.url}/${id}/start`, {})
      .pipe(map((response) => this.unwrap(response)));
  }
  copy(id: number) {
    return this.http
      .post<ApiResponse<number>>(`${this.url}/${id}/copy`, {}, { params: this.params() })
      .pipe(map((response) => this.unwrap(response)));
  }
  repeat(id: number) {
    return this.http
      .post<ApiResponse<PersonalProgramDetail>>(
        `${this.url}/${id}/repeat`,
        {},
        { params: this.params() },
      )
      .pipe(map((response) => this.unwrap(response)));
  }
  listTemplates() {
    return this.http
      .get<ApiResponse<WorkoutTemplate[]>>(API_ENDPOINTS.workoutTemplates)
      .pipe(map((response) => this.unwrap(response)));
  }
  saveTemplate(sourceProgramId: number, expectedVersion: number) {
    return this.http
      .post<ApiResponse<WorkoutTemplate>>(API_ENDPOINTS.workoutTemplates, {
        sourceProgramId,
        expectedVersion,
      })
      .pipe(map((response) => this.unwrap(response)));
  }
  favoriteTemplate(id: number, favorite: boolean) {
    return this.http
      .put<ApiResponse<WorkoutTemplate>>(`${API_ENDPOINTS.workoutTemplates}/${id}/favorite`, {
        favorite,
      })
      .pipe(map((response) => this.unwrap(response)));
  }
  useTemplate(id: number) {
    return this.http
      .post<ApiResponse<PersonalProgramDetail>>(`${API_ENDPOINTS.workoutTemplates}/${id}/use`, {})
      .pipe(map((response) => this.unwrap(response)));
  }
  deleteTemplate(id: number) {
    return this.http
      .delete<ApiResponse<number>>(`${API_ENDPOINTS.workoutTemplates}/${id}`)
      .pipe(map((response) => this.unwrap(response)));
  }
  delete(id: number) {
    return this.http
      .delete<ApiResponse<number>>(`${this.url}/${id}`)
      .pipe(map((response) => this.unwrap(response)));
  }
}
