import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { API_ENDPOINTS } from '../../api-endpoints';

@Injectable({
  providedIn: 'root'
})
export class CoachProfileService {

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  getMemberById(id: number): Observable<any> {
    return this.http.get<any>(
      `${API_ENDPOINTS.members}/${id}`
    ).pipe(
      map(res => res.data)
    );
  }

  /** Bejelentkezett felhasználó profiljának lekérése */
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
