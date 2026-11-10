import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { ApiResponse } from '../../models/backend-dto/common/api-response';

export interface UserDeletionPreview {
  userId: number;
  accountUuid: string;
  username: string;
  email: string;
  deletable: boolean;
  affectedData: Record<'workouts' | 'programAssignments' | 'personalPrograms' | 'templates' | 'reports', number>;
}
@Injectable({ providedIn: 'root' })
export class AdminUserDeletionService {
  private readonly url = `${environment.apiUrl}/admin/user-deletions`;
  constructor(private readonly http: HttpClient) {}
  preview(lookup: { userId?: number; email?: string }) {
    return this.http.post<ApiResponse<UserDeletionPreview>>(`${this.url}/preview`, lookup).pipe(map(response => {
      if (!response.success || !response.data) throw new Error('userDeletion.loadError');
      return response.data;
    }));
  }
  delete(preview: UserDeletionPreview, confirmationEmail: string, deletionRequestId?: number) {
    return this.http.post<ApiResponse<null>>(this.url, {
      userId: preview.userId, accountUuid: preview.accountUuid, confirmationEmail,
      identityVerified: true, deletionRequestId,
    }).pipe(map(response => {
      if (!response.success) throw new Error('userDeletion.deleteError');
      return preview.userId;
    }));
  }
}
