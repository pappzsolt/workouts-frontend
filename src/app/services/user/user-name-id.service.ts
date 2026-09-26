import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { API_ENDPOINTS } from '../../api-endpoints';
import { ApiResponse } from '../../models/backend-dto/common/api-response';
import type { UserDto } from '../../models/backend-dto/members/user-dto';

export interface UserNameId {
  id: number;
  username: string;
}

@Injectable({
  providedIn: 'root',
})
export class UserNameIdService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = API_ENDPOINTS.usersNameId;

  getAllUsers(): Observable<ApiResponse<UserNameId[]>> {
    return this.http.get<ApiResponse<UserDto[]>>(this.apiUrl).pipe(
      map((response) => ({
        ...response,
        data: (response.data ?? [])
          .filter((user): user is UserDto & { id: number } => user.id != null)
          .map((user) => ({ id: user.id, username: user.username ?? "" })),
      })),
    );
  }
}
