import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { AuthService } from '../auth/auth.service';
import { API_ENDPOINTS } from '../../api-endpoints';
import { ApiResponse } from '../../models/api-response.model';
import { Member } from '../../models/member.model';
import { UpdateCoachRequest } from '../../models/update-coach-request.model';

@Injectable({
  providedIn: 'root',
})
export class CoachProfileService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  getMemberById(id: number): Observable<Member & { createdAt?: string }> {
    return this.http
      .get<ApiResponse<Member & { createdAt?: string }>>(API_ENDPOINTS.memberById(id))
      .pipe(map((response) => response.data));
  }

  getLoggedInMemberProfile(): Observable<Member & { createdAt?: string }> {
    const userId = this.authService.getUserId();

    if (!userId) {
      throw new Error('Nincs bejelentkezett felhasználó');
    }

    return this.getMemberById(userId);
  }

  saveCoachProfile(profile: Omit<UpdateCoachRequest, 'roleIds'>): Observable<ApiResponse<void>> {
    return this.http.put<ApiResponse<void>>(API_ENDPOINTS.myCoachProfile, profile);
  }
}
