import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';

import { API_ENDPOINTS } from '../../api-endpoints';
import {
  Role,
  RoleApiResponse,
  UserWithRolesDto
} from '../../models/role.model';

@Injectable({
  providedIn: 'root'
})
export class RoleService {

  private readonly apiUrl = API_ENDPOINTS.usersWithRoles;

  constructor(
    private readonly http: HttpClient
  ) {}

  getRoles(): Observable<Role[]> {

    return this.http
      .get<RoleApiResponse>(this.apiUrl)
      .pipe(
        map(response => this.extractUniqueRoles(response.data)),

        catchError(error => {
          console.error('Hiba a role-ok lekérésekor:', error);

          return throwError(
            () => new Error(
              error?.message || 'Hiba a role-ok lekérésekor'
            )
          );
        })
      );
  }

  private extractUniqueRoles(
    users: UserWithRolesDto[]
  ): Role[] {

    const rolesMap = new Map<number, Role>();

    users.forEach(user => {
      user.roles?.forEach(role => {
        rolesMap.set(role.id, role);
      });
    });

    return Array.from(rolesMap.values());
  }
}
