import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { API_ENDPOINTS } from '../../api-endpoints';

import {
  RawUser,
  Coach,
  Role,
  UserListResponse,
  CoachListResponse,
  RoleListResponse,
  UpdateUserRequest
} from '../../models/user-edit-model';

@Injectable({
  providedIn: 'root'
})
export class UserEditService {

  private apiUrl = API_ENDPOINTS.members;
  private coachesUrl = `${this.apiUrl}/all-coaches`;
  private usersUrl = `${this.apiUrl}/all-users`;
  private rolesUrl = API_ENDPOINTS.roles;

  constructor(private http: HttpClient) {}

  getUsers(): Observable<RawUser[]> {
    return this.http.get<UserListResponse>(this.usersUrl).pipe(
      map(response => response.data)
    );
  }

  getCoaches(): Observable<Coach[]> {
    return this.http.get<CoachListResponse>(this.coachesUrl).pipe(
      map(response =>
        response.data.map(coach => ({
          id: coach.id,
          name: coach.usernameOrName
        }))
      )
    );
  }

  getRoles(): Observable<Role[]> {
    return this.http.get<RoleListResponse>(this.rolesUrl).pipe(
      map(response => response.data)
    );
  }

  updateUser(
    user: RawUser,
    roleIds: number[]
  ): Observable<void> {

    const payload: UpdateUserRequest = {
      type: 'user',
      username: user.usernameOrName,
      email: user.email,
      avatarUrl: user.avatarUrl,
      age: user.extraFields?.age,
      weight: user.extraFields?.weight,
      height: user.extraFields?.height,
      gender: user.extraFields?.gender,
      goals: user.extraFields?.goals,
      coachId: user.extraFields?.coach_id,
      roleIds: roleIds || []
    };

    if (user.password && user.password.trim() !== '') {
      payload.passwordHash = user.password;
    }

    if (user.id) {
      payload.id = user.id;
    }

    return this.http.post<void>(this.apiUrl, payload);
  }
}
