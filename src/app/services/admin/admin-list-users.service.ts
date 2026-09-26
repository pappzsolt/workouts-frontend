import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import type { ApiResponse } from '../../models/backend-dto/common/api-response';
import type { MemberResponse } from '../../models/backend-dto/members/member-response';
import { User } from '../../models/user.model';
import { API_ENDPOINTS } from '../../api-endpoints';

@Injectable({
  providedIn: 'root',
})
export class AdminListUsersService {
  private readonly apiUrl = API_ENDPOINTS.members;

  constructor(private readonly http: HttpClient) {}

  getUsers(): Observable<User[]> {
    return this.http.get<ApiResponse<MemberResponse[]>>(this.apiUrl).pipe(
      map((response) =>
        (response.data ?? [])
          .filter(
            (member): member is MemberResponse & {
              id: number;
              usernameOrName: string;
              email: string;
            } =>
              member.id != null &&
              member.usernameOrName != null &&
              member.email != null,
          )
          .map((member) => ({
            id: member.id,
            username: member.usernameOrName,
            email: member.email,
            roles: member.roles ?? [],
          })),
      ),
      catchError(() =>
        throwError(() => new Error('A felhasználók listájának betöltése nem sikerült.')),
      ),
    );
  }
}
