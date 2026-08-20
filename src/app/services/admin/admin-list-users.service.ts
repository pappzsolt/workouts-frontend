import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { MembersResponse } from '../../models/member.model';
import { User } from '../../models/user.model';
import { API_ENDPOINTS } from '../../api-endpoints';

@Injectable({
  providedIn: 'root'
})
export class AdminListUsersService {

  private readonly apiUrl = API_ENDPOINTS.members;

  constructor(
    private readonly http: HttpClient
  ) {}

  /**
   * Felhasználók lekérése az admin felülethez.
   */
  getUsers(): Observable<User[]> {

    return this.http
      .get<MembersResponse>(this.apiUrl)
      .pipe(

        map(response =>
          response.data.map(member => ({
            id: member.id,
            username: member.usernameOrName,
            email: member.email,
            roles: member.roles
          }))
        ),

        catchError(() =>
          throwError(() =>
            new Error(
              'A felhasználók listájának betöltése nem sikerült.'
            )
          )
        )
      );
  }
}
