import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import type { PageResponse } from '../../models/backend-dto/common/page-response';
import type { LoginAuditLogDto } from '../../models/backend-dto/admin/login-audit-log-dto';
import { Subject } from 'rxjs';
import { UserEditService } from './user-edit.service';
import { MemberSearchService } from './member-search.service';
import { LoginAuditLogsService } from './login-audit-logs.service';
import { LoginAuditLogsComponent } from '../../components/admin-dashboard/operations/login-audit-logs/login-audit-logs.component';
import { API_ENDPOINTS } from '../../api-endpoints';

describe('Admin public coach contracts and audit request ordering', () => {
  it('preserves public coach names in registration choices', () => {
    TestBed.configureTestingModule({providers: [provideHttpClient(), provideHttpClientTesting()]});
    const http = TestBed.inject(HttpTestingController);
    let name: string | undefined;
    TestBed.inject(UserEditService).getCoaches().subscribe(rows => name = rows[0].name);
    http.expectOne(API_ENDPOINTS.allCoaches).flush({success: true, data: [{id: 9, name: 'Trainer', specialization: null, avatarUrl: null}]});
    expect(name).toBe('Trainer');
    http.verify();
  });

  it('accepts public coach data without an email in member search', () => {
    TestBed.configureTestingModule({providers: [provideHttpClient(), provideHttpClientTesting()]});
    const http = TestBed.inject(HttpTestingController);
    let error: unknown;
    let emitted = false;
    let coachName: string | undefined;
    TestBed.inject(MemberSearchService).searchMembers('user').subscribe({next: result => { emitted = true; coachName = result.data[0].coach?.usernameOrName; }, error: value => error = value});
    http.expectOne(req => req.url === API_ENDPOINTS.memberSearch).flush({success: true, data: [{id: 1, type: 'user', usernameOrName: 'User', email: 'user@example.com', extraFields: {coach_id: 9}}]});
    http.expectOne(API_ENDPOINTS.coachById(9)).flush({success: true, data: {id: 9, name: 'Trainer', specialization: null, avatarUrl: null}});
    expect(emitted).toBeTrue();
    expect(coachName).toBe('Trainer');
    expect(error).toBeUndefined();
    http.verify();
  });

  it('keeps cleared-filter audit results when an older response arrives', () => {
    const requests: Subject<PageResponse<LoginAuditLogDto>>[] = [];
    TestBed.configureTestingModule({providers: [{provide: LoginAuditLogsService, useValue: {getLoginAuditLogs: () => {
      const response = new Subject<PageResponse<LoginAuditLogDto>>(); requests.push(response); return response;
    }}}]});
    const component = TestBed.runInInjectionContext(() => new LoginAuditLogsComponent(TestBed.inject(LoginAuditLogsService)));
    const page = (id: number): PageResponse<LoginAuditLogDto> => ({content: [{id, accountType: 'USER', accountId: id, username: 'user', loggedInAt: '2026-10-23T10:00:00', ipAddress: null, userAgent: null}], page: 0, size: 50, totalElements: 1, totalPages: 1});
    requests[0].next(page(1));
    component.filters.username = 'old-filter';
    component.applyFilters();
    component.clearFilters();
    requests[2].next(page(3));
    requests[1].next(page(2));
    expect(component.filters.username).toBe('');
    expect(component.logs[0].id).toBe(3);
    expect(component.loading).toBeFalse();
  });
});
