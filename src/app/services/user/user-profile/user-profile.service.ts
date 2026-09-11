import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { RawUser, Coach, Role } from '../../../models/user-profil.model';
import { API_ENDPOINTS } from '../../../api-endpoints';
import { ApiResponse } from '../../../models/api-response.model';

@Injectable({
  providedIn: 'root',
})
export class UserProfilService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = API_ENDPOINTS.members;
  private readonly coachesUrl = API_ENDPOINTS.allCoaches;
  private readonly usersUrl = `${this.apiUrl}/all-users`;
  private readonly rolesUrl = API_ENDPOINTS.roles;

  /**
   * Összes user lekérése.
   */
  getUsers(): Observable<RawUser[]> {
    return this.http
      .get<ApiResponse<RawUser[]>>(this.usersUrl)
      .pipe(map((response) => response.data));
  }

  /**
   * Összes coach lekérése.
   */
  getCoaches(): Observable<Coach[]> {
    return this.http.get<ApiResponse<RawUser[]>>(this.coachesUrl).pipe(
      map((response) =>
        response.data.map((coach) => ({
          id: coach.id,
          name: coach.usernameOrName,
        })),
      ),
    );
  }

  /**
   * Összes role lekérése.
   */
  getRoles(): Observable<Role[]> {
    return this.http.get<ApiResponse<Role[]>>(this.rolesUrl).pipe(map((response) => response.data));
  }

  /**
   * Egy member lekérése ID alapján.
   */
  getMemberById(id: number): Observable<RawUser> {
    return this.http
      .get<ApiResponse<RawUser>>(`${this.apiUrl}/${id}`)
      .pipe(map((response) => response.data));
  }

  /**
   * A bejelentkezett USER saját profiljának módosítása.
   */
  updateUser(user: RawUser): Observable<ApiResponse<void>> {
    const payload = {
      id: user.id,
      type: 'user' as const,

      username: user.usernameOrName,
      email: user.email,

      avatarUrl: user.avatarUrl,

      age: user.extraFields?.age,
      weight: user.extraFields?.weight,
      height: user.extraFields?.height,
      gender: user.extraFields?.gender,
      goals: user.extraFields?.goals,

      coachId: user.extraFields?.coach_id,

      ...(user.password?.trim() ? { passwordHash: user.password } : {}),
    };

    return this.http.post<ApiResponse<void>>(`${this.apiUrl}/my-profile`, payload);
  }
}
