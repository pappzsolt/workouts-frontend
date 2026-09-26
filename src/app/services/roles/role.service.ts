import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';

import { API_ENDPOINTS } from '../../api-endpoints';
import type { RoleDto } from '../../models/backend-dto/roles/role-dto';
import type { UserWithRolesDto } from '../../models/backend-dto/members/user-with-roles-dto';
import type { ApiResponse } from '../../models/backend-dto/common/api-response';
import { Role } from '../../models/role.model';

@Injectable({
  providedIn: 'root',
})
export class RoleService {
  private readonly apiUrl = API_ENDPOINTS.usersWithRoles;

  constructor(private readonly http: HttpClient) {}

  getRoles(): Observable<Role[]> {
    return this.http.get<ApiResponse<UserWithRolesDto[]>>(this.apiUrl).pipe(
      map((response) => this.extractUniqueRoles(response.data ?? [])),

      catchError((error) => {
        console.error('Hiba a role-ok lekérésekor:', error);

        return throwError(() => new Error(error?.message || 'Hiba a role-ok lekérésekor'));
      }),
    );
  }

  private extractUniqueRoles(users: UserWithRolesDto[]): Role[] {
    const rolesMap = new Map<number, Role>();

    users.forEach((user) => {
      user.roles?.forEach((role: RoleDto | null) => {
        if (role?.id != null && role.name != null) {
          rolesMap.set(role.id, { id: role.id, name: role.name });
        }
      });
    });

    return Array.from(rolesMap.values());
  }
}
