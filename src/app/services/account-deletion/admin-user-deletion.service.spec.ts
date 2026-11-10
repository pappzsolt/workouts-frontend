import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AdminUserDeletionService, UserDeletionPreview } from './admin-user-deletion.service';

describe('Typed user deletion API', () => {
  let http: HttpTestingController; let service: AdminUserDeletionService;
  beforeEach(() => { TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController); service = TestBed.inject(AdminUserDeletionService); });
  afterEach(() => http.verify());
  it('posts lookup and confirmation to protected endpoints with stable account identity', () => {
    service.preview({ userId: 7 }).subscribe();
    const request = http.expectOne(r => r.url.endsWith('/admin/user-deletions/preview'));
    expect(request.request.body).toEqual({ userId: 7 });
    const preview = { userId: 7, accountUuid: 'identity', email: 'user@example.com' } as UserDeletionPreview;
    request.flush({ success: true, data: preview });
    service.delete(preview, 'user@example.com', 12).subscribe();
    const deletion = http.expectOne(r => r.url.endsWith('/admin/user-deletions'));
    expect(deletion.request.body).toEqual({ userId: 7, accountUuid: 'identity', confirmationEmail: 'user@example.com', identityVerified: true, deletionRequestId: 12 });
    deletion.flush({ success: true, data: null });
  });
});
