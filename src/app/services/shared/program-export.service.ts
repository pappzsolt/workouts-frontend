import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_ENDPOINTS } from '../../api-endpoints';
import { withJsonErrors } from './blob-error';
import { LanguageService } from './language.service';

/**
 * Egy felhasználó programjának összes edzése, gyakorlata és sorozata Excel-fájlként.
 * Az edző az ügyfeléét, a felhasználó a sajátját töltheti le (a backend ellenőrzi).
 */
@Injectable({ providedIn: 'root' })
export class ProgramExportService {
  private readonly http = inject(HttpClient);
  private readonly languageService = inject(LanguageService);

  exportUserProgram(userId: number, programId: number): Observable<Blob> {
    const params = new HttpParams().set('language', this.languageService.getCurrentLanguage());
    return withJsonErrors(this.http.get(API_ENDPOINTS.userProgramExport(userId, programId), { params, responseType: 'blob' }));
  }
}
