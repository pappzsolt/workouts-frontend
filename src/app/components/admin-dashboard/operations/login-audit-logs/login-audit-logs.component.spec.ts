import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { API_ENDPOINTS } from '../../../../api-endpoints';
import { LoginAuditLogsService } from "../../../../services/admin/login-audit-logs.service";
import { LoginAuditLogsComponent } from './login-audit-logs.component';

describe('Login audit applied filters', () => {
  let component: LoginAuditLogsComponent;
  let http: HttpTestingController;

  const request = (params: Record<string, string>) => {
    const result = http.expectOne(req => req.url === API_ENDPOINTS.adminLoginAuditLogs);
    expect(Object.fromEntries(result.request.params.keys().map(key => [key, result.request.params.get(key)]))).toEqual(params);
    return result;
  };
  const respond = (params: Record<string, string>) => request(params).flush({
    success: true, data: { content: [{ id: 3 }, { id: 1 }], page: Number(params['page']),
      size: Number(params['size']), totalElements: 305, totalPages: 7 },
  });

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    component = TestBed.runInInjectionContext(() => new LoginAuditLogsComponent(TestBed.inject(
      LoginAuditLogsService,
    )));
    respond({ page: '0', size: '50' });
  });

  afterEach(() => http.verify());

  it('leaves edits unapplied on Next and on a page-size change', () => {
    component.filters.username = 'unapplied';
    http.expectNone(req => req.url === API_ENDPOINTS.adminLoginAuditLogs);
    component.onPageChange(2);
    respond({ page: '1', size: '50' });
    expect(component.currentPage).toBe(2);
    expect(component.logs.map(log => log.id)).toEqual([3, 1]);
    component.onPageSizeChange(100);
    respond({ page: '0', size: '100' });
    expect(component.currentPage).toBe(1);
    expect(component.filters.username).toBe('unapplied');
  });

  it('applies every valid field, rejects invalid drafts, and clears both filter states', () => {
    const applied = { accountType: 'COACH', accountId: '17', username: 'coach', from: '2026-10-01', to: '2026-10-02' };
    component.filters = { ...applied, accountType: 'COACH', accountId: 17, username: ' coach ' };
    component.applyFilters();
    respond({ page: '0', size: '50', ...applied });
    component.filters.from = '2026-10-03';
    component.applyFilters();
    expect(component.message).toBe('adminLoginAudit.errors.invalidDateRange');
    http.expectNone(req => req.url === API_ENDPOINTS.adminLoginAuditLogs);
    component.onPageChange(2);
    respond({ page: '1', size: '50', ...applied });
    component.onPageSizeChange(25);
    respond({ page: '0', size: '25', ...applied });
    component.clearFilters();
    respond({ page: '0', size: '25' });
    component.onPageChange(2);
    respond({ page: '1', size: '25' });
    expect(component.filters).toEqual({ accountType: '', accountId: null, username: '', from: '', to: '' });
  });

  it('cancels an older page when applying filters', () => {
    component.onPageChange(2);
    const old = request({ page: '1', size: '50' });
    component.filters.username = 'new';
    component.applyFilters();
    expect(old.cancelled).toBeTrue();
    respond({ page: '0', size: '50', username: 'new' });
    expect(component.loading).toBeFalse();
    expect(component.currentPage).toBe(1);
  });
});
