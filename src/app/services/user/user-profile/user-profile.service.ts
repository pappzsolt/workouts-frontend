import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { RawUser } from '../../../models/user-profil.model';
import type { CoachNameId } from '../../../models/common/coach-name-id.model';
import type { MemberResponse } from '../../../models/backend-dto/members/member-response';
import type { CoachDto } from '../../../models/backend-dto/coach/coach-dto';
import type { MemberRequest } from '../../../models/backend-dto/members/member-request';
import { API_ENDPOINTS } from '../../../api-endpoints';
import { ApiResponse } from '../../../models/backend-dto/common/api-response';

@Injectable({
  providedIn: 'root',
})
export class UserProfilService {
  private readonly http = inject(HttpClient);

  private readonly coachesUrl = API_ENDPOINTS.allCoaches;
  getCoaches(): Observable<CoachNameId[]> {
    return this.http.get<ApiResponse<CoachDto[]>>(this.coachesUrl).pipe(
      map((response) =>
        (response.data ?? []).flatMap((coach) =>
          coach.id != null && coach.name != null
            ? [{ id: coach.id, name: coach.name }]
            : [],
        ),
      ),
    );
  }

  getMemberById(id: number): Observable<RawUser> {
    return this.http
      .get<ApiResponse<MemberResponse>>(API_ENDPOINTS.memberById(id))
      .pipe(
        map((response) => {
          const user = response.data == null ? null : this.toRawUser(response.data);

          if (user == null) {
            throw new Error('A user profil válaszában nincs érvényes adat.');
          }

          return user;
        }),
      );
  }

  updateUser(user: RawUser): Observable<ApiResponse<void>> {
    const payload: MemberRequest = {
      id: user.id,
      type: 'user',
      username: user.usernameOrName,
      name: user.usernameOrName,
      email: user.email,
      passwordHash: user.password?.trim() ? user.password : null,
      age: user.extraFields?.age ?? null,
      weight: user.extraFields?.weight ?? null,
      height: user.extraFields?.height ?? null,
      gender: user.extraFields?.gender ?? null,
      goals: user.extraFields?.goals ?? null,
      avatarUrl: user.avatarUrl ?? null,
      // Saját profilból a coach-hozzárendelés nem módosítható.
      coachId: null,
      phone: null,
      specialization: null,
      roleIds: null,
    };

    return this.http.post<ApiResponse<void>>(API_ENDPOINTS.myProfile, payload);
  }

  private toRawUser(member: MemberResponse): RawUser | null {
    if (member.id == null || member.usernameOrName == null || member.email == null) {
      return null;
    }

    return {
      id: member.id,
      usernameOrName: member.usernameOrName,
      email: member.email,
      avatarUrl: member.avatarUrl ?? undefined,
      roles: member.roles ?? [],
      extraFields: {
        coach_id: this.numberField(member.extraFields, 'coach_id'),
        age: this.numberField(member.extraFields, 'age'),
        weight: this.numberField(member.extraFields, 'weight'),
        height: this.numberField(member.extraFields, 'height'),
        gender: this.stringField(member.extraFields, 'gender'),
        goals: this.stringField(member.extraFields, 'goals'),
      },
    };
  }

  private numberField(fields: Record<string, unknown> | null, key: string): number | undefined {
    const value = fields?.[key];
    return typeof value === 'number' ? value : undefined;
  }

  private stringField(fields: Record<string, unknown> | null, key: string): string | undefined {
    const value = fields?.[key];
    return typeof value === 'string' ? value : undefined;
  }
}
