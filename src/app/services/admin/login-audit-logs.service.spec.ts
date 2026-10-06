import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_ENDPOINTS } from '../../api-endpoints';
import { LoginAuditLogsService } from './login-audit-logs.service';

describe('LoginAuditLogsService', () => {
  let service: LoginAuditLogsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(LoginAuditLogsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('uses backend paging and sends only active audit filters', () => {
    service.getLoginAuditLogs({
      page: 2,
      size: 50,
      accountType: 'USER',
      accountId: 319,
      username: ' admin ',
      from: '2026-10-01T00:00',
      to: '2026-10-06T23:59',
    }).subscribe((page) => {
      expect(page.totalElements).toBe(1);
      expect(page.content[0].username).toBe('admin');
    });

    const request = http.expectOne((candidate) =>
      candidate.url === API_ENDPOINTS.adminLoginAuditLogs
      && candidate.params.get('page') === '2'
      && candidate.params.get('size') === '50'
      && candidate.params.get('accountType') === 'USER'
      && candidate.params.get('accountId') === '319'
      && candidate.params.get('username') === 'admin'
      && candidate.params.get('from') === '2026-10-01T00:00'
      && candidate.params.get('to') === '2026-10-06T23:59',
    );

    expect(request.request.method).toBe('GET');
    request.flush({
      success: true,
      message: null,
      data: {
        content: [{
          id: 1,
          accountType: 'USER',
          accountId: 319,
          username: 'admin',
          loggedInAt: '2026-10-06T10:00:00',
          ipAddress: '127.0.0.1',
          userAgent: 'test',
        }],
        page: 2,
        size: 50,
        totalElements: 1,
        totalPages: 1,
      },
    });
  });
});
