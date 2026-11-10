import { Injectable } from '@angular/core';
import { HttpClient, HttpContext, HttpContextToken, HttpParams } from '@angular/common/http';
import { map } from 'rxjs';
import { API_ENDPOINTS } from '../../api-endpoints';
import type { ApiResponse } from '../../models/backend-dto/common/api-response';
import type { PageResponse } from '../../models/backend-dto/common/page-response';

export const PUBLIC_REQUEST = new HttpContextToken<boolean>(() => false);
export interface DeletionConfig {
  appName: string;
  captchaSiteKey: string;
  supportEmail: string;
  processingTime: string;
  retentionPolicy: string;
}
export interface DeletionRequest {
  id: number;
  email: string;
  message: string | null;
  status: 'PENDING' | 'COMPLETED' | 'REJECTED';
  createdAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
  resolutionNote: string | null;
}
@Injectable({ providedIn: 'root' })
export class AccountDeletionService {
  constructor(private readonly http: HttpClient) {}
  config() {
    return this.http.get<DeletionConfig>('assets/account-deletion.json', {
      context: new HttpContext().set(PUBLIC_REQUEST, true),
      headers: { 'Cache-Control': 'no-cache' },
    });
  }
  submit(body: { email: string; message: string; captchaToken: string }) {
    return this.http.post<ApiResponse<null>>(API_ENDPOINTS.accountDeletion, body, {
      context: new HttpContext().set(PUBLIC_REQUEST, true),
    }).pipe(map(response => {
      if (!response.success) throw new Error('deleteAccount.errors.submit');
      return response;
    }));
  }
  list(page: number) {
    const params = new HttpParams().set('page', page).set('size', 20);
    return this.http.get<ApiResponse<PageResponse<DeletionRequest>>>(API_ENDPOINTS.adminAccountDeletion, { params })
      .pipe(map(response => {
        if (!response.success || response.data == null) throw new Error('deleteAccount.admin.loadError');
        return response.data;
      }));
  }
  resolve(id: number, status: 'COMPLETED' | 'REJECTED', note: string) {
    return this.http.patch<ApiResponse<null>>(`${API_ENDPOINTS.adminAccountDeletion}/${id}/resolution`, { status, note })
      .pipe(map(response => {
        if (!response.success) throw new Error('deleteAccount.admin.saveError');
        return response;
      }));
  }
}
