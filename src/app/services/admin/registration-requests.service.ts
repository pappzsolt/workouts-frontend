import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';

import { API_ENDPOINTS } from '../../api-endpoints';
import type { ApiResponse } from '../../models/backend-dto/common/api-response';
import type { PageResponse } from '../../models/backend-dto/common/page-response';
import type { RegistrationRequestDto, RegistrationStatus } from '../../models/backend-dto/registration/registration';

/** Regisztrációs kérelmek admin kezelése (lista, jóváhagyás, elutasítás). */
@Injectable({ providedIn: 'root' })
export class RegistrationRequestsService {
  constructor(private readonly http: HttpClient) {}

  list(status: RegistrationStatus, page: number, size: number): Observable<PageResponse<RegistrationRequestDto>> {
    const params = new HttpParams().set('status', status).set('page', String(page)).set('size', String(size));
    return this.http
      .get<ApiResponse<PageResponse<RegistrationRequestDto>>>(API_ENDPOINTS.adminRegistrations, { params })
      .pipe(map((response) => this.data(response, 'adminRegistrations.errors.load')));
  }

  pendingCount(): Observable<number> {
    return this.http
      .get<ApiResponse<{ count: number }>>(API_ENDPOINTS.adminRegistrationsPendingCount)
      .pipe(map((response) => this.data(response, 'adminRegistrations.errors.load').count));
  }

  /** Jóváhagyás; ügyfélnél opcionálisan az edző, akihez tartozni fog. Sikernél a backend üzenete. */
  approve(id: number, coachId: number | null): Observable<string> {
    return this.http
      .post<ApiResponse<null>>(API_ENDPOINTS.adminRegistrationApprove(id), { coachId })
      .pipe(map((response) => response.message ?? 'adminRegistrations.approved'));
  }

  reject(id: number, reason: string | null): Observable<string> {
    return this.http
      .post<ApiResponse<null>>(API_ENDPOINTS.adminRegistrationReject(id), { reason })
      .pipe(map((response) => response.message ?? 'adminRegistrations.rejected'));
  }

  private data<T>(response: ApiResponse<T>, fallback: string): T {
    if (!response.success || response.data === null) {
      throw new Error(response.message || fallback);
    }
    return response.data;
  }
}
