import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { API_ENDPOINTS } from '../../api-endpoints';

import { ApiResponse } from '../../models/backend-dto/common/api-response';
import type { MemberResponse } from '../../models/backend-dto/members/member-response';
import type { RoleDto } from '../../models/backend-dto/roles/role-dto';
import type { Role } from '../../models/role.model';

import {
  RawUser,
  Coach,
  UpdateUserRequest,
} from '../../models/user-edit-model';

@Injectable({
  providedIn: 'root',
})
export class UserEditService {
  private readonly apiUrl = API_ENDPOINTS.members;

  private readonly coachesUrl = API_ENDPOINTS.allCoaches;

  private readonly usersUrl = API_ENDPOINTS.allUsers;

  private readonly rolesUrl = API_ENDPOINTS.roles;

  constructor(private readonly http: HttpClient) {}

  getUsers(): Observable<RawUser[]> {
    return this.http.get<ApiResponse<MemberResponse[]>>(this.usersUrl).pipe(
      map((response) => (response.data ?? [])
        .filter((user): user is MemberResponse & { id: number } => user.id != null)
        .map((user) => ({
          id: user.id,
          usernameOrName: user.usernameOrName ?? '',
          email: user.email ?? '',
          avatarUrl: user.avatarUrl ?? undefined,
          roles: user.roles ?? [],
          extraFields: {
            coach_id: this.getNumberExtraField(user.extraFields?.['coach_id']),
            age: this.getNumberExtraField(user.extraFields?.['age']),
            weight: this.getNumberExtraField(user.extraFields?.['weight']),
            height: this.getNumberExtraField(user.extraFields?.['height']),
            gender: this.getStringExtraField(user.extraFields?.['gender']),
            goals: this.getStringExtraField(user.extraFields?.['goals']),
          },
        }))),
    );
  }

  getCoaches(): Observable<Coach[]> {
    return this.http.get<ApiResponse<MemberResponse[]>>(this.coachesUrl).pipe(
      map((response) =>
        (response.data ?? []).filter((coach): coach is MemberResponse & { id: number } => coach.id != null).map((coach) => ({
          id: coach.id,
          name: coach.usernameOrName ?? '',
        })),
      ),
    );
  }

  getRoles(): Observable<Role[]> {
    return this.http.get<ApiResponse<RoleDto[]>>(this.rolesUrl).pipe(
      map((response) => (response.data ?? [])
        .filter((role): role is RoleDto & { id: number } => role.id != null)
        .map((role) => ({ id: role.id, name: role.name ?? '' }))),
    );
  }

  updateUser(user: RawUser, roleIds: number[]): Observable<ApiResponse<void>> {
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
      roleIds: roleIds || [],
    };

    if (user.password && user.password.trim() !== '') {
      payload.passwordHash = user.password;
    }

    if (user.id) {
      payload.id = user.id;
    }

    return this.http.post<ApiResponse<void>>(this.apiUrl, payload);
  }
  private getNumberExtraField(value: unknown): number | undefined {
    return typeof value === 'number' ? value : undefined;
  }

  private getStringExtraField(value: unknown): string | undefined {
    return typeof value === 'string' ? value : undefined;
  }

}
