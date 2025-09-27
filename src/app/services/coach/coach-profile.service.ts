import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { AuthService } from '../auth/auth.service';

@Injectable({
  providedIn: 'root'
})
export class CoachProfileService {
  private baseUrl = 'http://localhost:8080/api/members';

  constructor(
    private http: HttpClient,
    private authService: AuthService // 🔹 AuthService injektálva
  ) {}

  getMemberById(id: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/${id}`).pipe(
      map(res => res.data) // csak a data rész kell
    );
  }

  /** 🔹 Bejelentkezett felhasználó profiljának lekérése */
  getLoggedInMemberProfile(): Observable<any> {
    const userId = this.authService.getUserId(); // ID a tokenből
    if (!userId) throw new Error('Nincs bejelentkezett felhasználó');
    return this.getMemberById(userId);
  }

  saveCoachProfile(profile: any): Observable<any> {
    return this.http.post<any>(this.baseUrl, profile);
  }
}
