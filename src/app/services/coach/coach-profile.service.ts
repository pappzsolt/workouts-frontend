import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { AuthService } from '../auth/auth.service';
import { API_ENDPOINTS } from '../../api-endpoints';

@Injectable({
  providedIn: 'root'
})
export class CoachProfileService {

  private http = inject(HttpClient);
  private authService = inject(AuthService);

  getMemberById(id: number): Observable<any> {
    return this.http.get<any>(
      `${API_ENDPOINTS.members}/${id}`
    ).pipe(
      map(response => response.data)
    );
  }

  getLoggedInMemberProfile(): Observable<any> {
    const userId = this.authService.getUserId();

    if (!userId) {
      throw new Error('Nincs bejelentkezett felhasználó');
    }

    return this.getMemberById(userId);
  }

  saveCoachProfile(profile: any): Observable<any> {
    return this.http.post<any>(
      API_ENDPOINTS.members,
      profile
    );
  }
}
