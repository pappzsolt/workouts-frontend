import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_ENDPOINTS } from '../../api-endpoints';
import { ApiResponse } from '../../models/api-response.model';

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
    return this.http.get<ApiResponse<UserNameId[]>>(this.apiUrl);
  }
}
