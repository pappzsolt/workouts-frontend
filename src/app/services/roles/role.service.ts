import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError, map } from 'rxjs';

export interface Role {
  id: number;
  name: string;
  description?: string;
}

interface UserWithRolesDto {
  id: number;
  username: string;
  roles: Role[];
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

@Injectable({
  providedIn: 'root'
})
export class RoleService {
  private apiUrl = 'http://localhost:8080/api/members/users-with-roles';

  constructor(private http: HttpClient) {}

  getRoles(): Observable<Role[]> {
    return this.http.get<ApiResponse<UserWithRolesDto[]>>(this.apiUrl).pipe(
      map(response => {
        const rolesMap: { [key: number]: Role } = {};
        response.data.forEach(user => {
          user.roles.forEach(role => {
            rolesMap[role.id] = role; // uniq by id
          });
        });
        return Object.values(rolesMap);
      }),
      catchError((err) => {
        console.error('Hiba a role-ok lekérésekor', err);
        return throwError(() => new Error(err.message || 'Hiba a role-ok lekérésekor'));
      })
    );
  }
}
