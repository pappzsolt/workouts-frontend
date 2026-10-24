import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, from, map, switchMap, throwError } from 'rxjs';

import { API_ENDPOINTS } from '../../api-endpoints';
import type { ApiResponse } from '../../models/backend-dto/common/api-response';
import type { PageResponse } from '../../models/backend-dto/common/page-response';
import type { BugReportCreated, BugReportDto, BugReportPayload } from '../../models/backend-dto/bug-report/bug-report';

/** Hibabejelentés beküldése (felhasználó, edző) és megtekintése (admin). */
@Injectable({ providedIn: 'root' })
export class BugReportService {
  private readonly http = inject(HttpClient);

  /** multipart/form-data; a bejelentőt és a dátumot a szerver állítja be. */
  submit(payload: BugReportPayload): Observable<{ created: BugReportCreated; message: string }> {
    const body = new FormData();
    body.append('title', payload.title);
    body.append('description', payload.description);
    if (payload.pageUrl) body.append('pageUrl', payload.pageUrl);
    for (const file of payload.screenshots) body.append('screenshots', file, file.name);
    return this.http.post<ApiResponse<BugReportCreated>>(API_ENDPOINTS.bugReports, body).pipe(
      map((response) => {
        if (!response?.success || !response.data) throw new Error(response?.message || 'bugReport.errors.submit');
        return { created: response.data, message: response.message || 'bugReport.success' };
      }),
    );
  }

  list(page: number, size: number): Observable<PageResponse<BugReportDto>> {
    const params = new HttpParams().set('page', String(page)).set('size', String(size));
    return this.http.get<ApiResponse<PageResponse<BugReportDto>>>(API_ENDPOINTS.adminBugReports, { params }).pipe(
      map((response) => {
        if (!response?.success || !response.data) throw new Error(response?.message || 'adminBugReports.errors.load');
        return response.data;
      }),
    );
  }

  /** A kép hitelesítéssel kérve, Blobként (közvetlen URL-ként nem kerül a böngészőbe). */
  screenshot(reportId: number, screenshotId: number): Observable<Blob> {
    return this.http
      .get(API_ENDPOINTS.adminBugReportScreenshot(reportId, screenshotId), { responseType: 'blob' })
      .pipe(catchError((error: unknown) => from(jsonError(error)).pipe(switchMap((parsed) => throwError(() => parsed)))));
  }
}

async function jsonError(error: unknown): Promise<unknown> {
  if (!(error instanceof HttpErrorResponse) || !(error.error instanceof Blob)) return error;
  try {
    return new HttpErrorResponse({
      error: JSON.parse(await error.error.text()),
      headers: error.headers,
      status: error.status,
      statusText: error.statusText,
      url: error.url ?? undefined,
    });
  } catch {
    return error;
  }
}
