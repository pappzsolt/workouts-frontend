import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
// importálod a modellekből
import { Member, MembersResponse } from '../../models/member.model';
import { User } from '../../models/user.model';
import { API_ENDPOINTS } from '../../api-endpoints';

@Injectable({
  providedIn: 'root'
})
export class AdminListUsersService {
  private apiUrl = API_ENDPOINTS.members;
  constructor(private http: HttpClient) {}

  /**
   * Visszaadja a Member[] listát a backendről (a data mezőből)
   */
  getMembers(): Observable<Member[]> {
    return this.http.get<MembersResponse>(this.apiUrl).pipe(
      map(response => response.data),
      catchError((error) => {
        console.error('Hiba történt a members lekérése közben:', error);
        return throwError(() => new Error('Nem sikerült betölteni a members listát.'));
      })
    );
  }

  /**
   * Csak User[]-t ad vissza, roles tömbbel (a data mezőből)
   */
  getUsers(): Observable<User[]> {
    return this.http.get<MembersResponse>(this.apiUrl).pipe(
      map(response =>
        response.data.map((member) => ({
          id: member.id,
          username: member.usernameOrName,
          email: member.email,
          roles: member.roles
        }))
      ),
      catchError((error) => {
        console.error('Hiba történt a users lekérése közben:', error);
        return throwError(() => new Error('Nem sikerült betölteni a users listát.'));
      })
    );
  }
}
