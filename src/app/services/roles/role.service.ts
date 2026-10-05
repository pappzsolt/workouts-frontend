import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';

import { LoggerService } from '../logger.service';
import { API_ENDPOINTS } from '../../api-endpoints';
import type { RoleDto } from '../../models/backend-dto/roles/role-dto';
import type { ApiResponse } from '../../models/backend-dto/common/api-response';
import { Role } from '../../models/role.model';

@Injectable({
  providedIn: 'root',
})
export class RoleService {
  private readonly logger = inject(LoggerService);
  private readonly apiUrl = API_ENDPOINTS.roles;

  constructor(private readonly http: HttpClient) {}

  getRoles(): Observable<Role[]> {
    return this.http.get<ApiResponse<RoleDto[]>>(this.apiUrl).pipe(
      map((response) =>
        (response.data ?? []).flatMap((role) =>
          role.id != null && role.name != null
            ? [{ id: role.id, name: role.name }]
            : [],
        ),
      ),
      catchError((error) => {
        this.logger.error('Hiba a role-ok lekérésekor:', error);
        return throwError(() => new Error(error?.message || 'roleSelect.loadError'));
      }),
    );
  }
}
