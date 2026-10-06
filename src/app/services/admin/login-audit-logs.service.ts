import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';

import { API_ENDPOINTS } from '../../api-endpoints';
import type { LoginAuditAccountType, LoginAuditLogDto } from '../../models/backend-dto/admin/login-audit-log-dto';
import type { ApiResponse } from '../../models/backend-dto/common/api-response';
import type { PageResponse } from '../../models/backend-dto/common/page-response';

export interface LoginAuditLogQuery {
  page: number;
  size: number;
  accountType?: LoginAuditAccountType | null;
  accountId?: number | null;
  username?: string | null;
  from?: string | null;
  to?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class LoginAuditLogsService {
  constructor(private readonly http: HttpClient) {}

  getLoginAuditLogs(query: LoginAuditLogQuery): Observable<PageResponse<LoginAuditLogDto>> {
    let params = new HttpParams()
      .set('page', String(query.page))
      .set('size', String(query.size));

    if (query.accountType) {
      params = params.set('accountType', query.accountType);
    }

    if (query.accountId != null) {
      params = params.set('accountId', String(query.accountId));
    }

    const username = query.username?.trim();
    if (username) {
      params = params.set('username', username);
    }

    if (query.from) {
      params = params.set('from', query.from);
    }

    if (query.to) {
      params = params.set('to', query.to);
    }

    return this.http
      .get<ApiResponse<PageResponse<LoginAuditLogDto>>>(API_ENDPOINTS.adminLoginAuditLogs, { params })
      .pipe(
        map((response) => {
          if (!response.success || !response.data) {
            throw new Error(response.message || 'adminLoginAudit.errors.load');
          }

          return response.data;
        }),
        catchError((error: HttpErrorResponse | Error) =>
          throwError(() => new Error(this.resolveErrorMessage(error))),
        ),
      );
  }

  private resolveErrorMessage(error: HttpErrorResponse | Error): string {
    if (error instanceof HttpErrorResponse) {
      if (typeof error.error === 'string' && error.error.trim()) {
        return error.error;
      }

      if (error.error?.message) {
        return error.error.message;
      }

      return 'adminLoginAudit.errors.load';
    }

    return error.message || 'adminLoginAudit.errors.load';
  }
}
