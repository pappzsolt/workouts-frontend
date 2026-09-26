import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { AuthService } from '../auth/auth.service';
import { API_ENDPOINTS } from '../../api-endpoints';
import { ApiResponse } from '../../models/backend-dto/common/api-response';
import type { MemberResponse } from '../../models/backend-dto/members/member-response';
import { Member } from '../../models/member.model';
import { UpdateCoachRequest } from '../../models/update-coach-request.model';

@Injectable({
  providedIn: 'root',
})
export class CoachProfileService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  getMemberById(id: number): Observable<Member & { createdAt?: string }> {
    return this.http
      .get<ApiResponse<MemberResponse>>(API_ENDPOINTS.memberById(id))
      .pipe(
        map((response): Member & { createdAt?: string } => {
          const member = response.data;

          if (member == null || member.id == null || member.usernameOrName == null || member.email == null) {
            throw new Error('A coach profil válaszában nincs érvényes adat.');
          }

          return {
            id: member.id,
            type: member.type === 'coach' ? 'coach' : 'user',
            usernameOrName: member.usernameOrName,
            email: member.email,
            avatarUrl: member.avatarUrl,
            roles: member.roles ?? [],
            extraFields: this.toExtraFields(member.extraFields),
          };
        }),
      );
  }

  getLoggedInMemberProfile(): Observable<Member & { createdAt?: string }> {
    const userId = this.authService.getUserId();

    if (!userId) {
      throw new Error('Nincs bejelentkezett felhasználó');
    }

    return this.getMemberById(userId);
  }

  private toExtraFields(extraFields: Record<string, unknown> | null): Member['extraFields'] {
    if (extraFields == null) {
      return {};
    }

    const result: Member['extraFields'] = {};

    for (const [key, value] of Object.entries(extraFields)) {
      if (typeof value === 'string' || typeof value === 'number') {
        result[key] = value;
      }
    }

    return result;
  }

  saveCoachProfile(profile: Omit<UpdateCoachRequest, 'roleIds'>): Observable<ApiResponse<void>> {
    return this.http.put<ApiResponse<void>>(API_ENDPOINTS.myCoachProfile, profile);
  }
}
