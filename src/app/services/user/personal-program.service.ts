import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map } from 'rxjs';
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
  get(id: number) {
    return this.http
      .get<ApiResponse<PersonalProgramDetail>>(`${this.url}/${id}`, { params: this.params() })
      .pipe(map((response) => this.unwrap(response)));
  }
  save(id: number | null, request: PersonalProgramRequest) {
    const result =
      id == null
        ? this.http.post<ApiResponse<number>>(this.url, request)
        : this.http.put<ApiResponse<number>>(`${this.url}/${id}`, request);
    return result.pipe(map((response) => this.unwrap(response)));
  }
  start(id: number) {
    return this.http
      .post<ApiResponse<number>>(`${this.url}/${id}/start`, {})
      .pipe(map((response) => this.unwrap(response)));
  }
  copy(id: number) {
    return this.http
      .post<ApiResponse<number>>(`${this.url}/${id}/copy`, {}, { params: this.params() })
      .pipe(map((response) => this.unwrap(response)));
  }
  delete(id: number) {
    return this.http
      .delete<ApiResponse<number>>(`${this.url}/${id}`)
      .pipe(map((response) => this.unwrap(response)));
  }
}
