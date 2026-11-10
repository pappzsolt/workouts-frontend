import { TestBed } from '@angular/core/testing';
import { HttpClient, HttpErrorResponse, HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { AuthInterceptor } from '../../interceptors/auth.interceptor';
import { AuthService } from '../auth/auth.service';
import { API_ENDPOINTS } from '../../api-endpoints';
import { AccountDeletionService } from './account-deletion.service';

describe('Public deletion requests', () => {
  let http: HttpTestingController;
  let service: AccountDeletionService;
  const auth = { getAccessToken: jasmine.createSpy().and.returnValue('expired-token'), refreshAccessToken: jasmine.createSpy(), logout: jasmine.createSpy() };
  const router = { navigate: jasmine.createSpy() };
  beforeEach(() => {
    Object.values(auth).forEach(spy => spy.calls.reset()); router.navigate.calls.reset();
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting(),
      { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
      { provide: AuthService, useValue: auth }, { provide: Router, useValue: router },
    ] });
    http = TestBed.inject(HttpTestingController); service = TestBed.inject(AccountDeletionService);
  });
  afterEach(() => http.verify());
  it('never sends stale credentials or refreshes a public request on 401', () => {
    let status = 0;
    service.submit({ email: 'a@example.com', message: '', captchaToken: 'token' }).subscribe({ error: (e: HttpErrorResponse) => status = e.status });
    const req = http.expectOne(API_ENDPOINTS.accountDeletion);
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(status).toBe(401);
    expect(auth.refreshAccessToken).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });
  it('keeps the existing bearer authentication for admin requests', () => {
    service.list(0).subscribe();
    const req = http.expectOne(r => r.url === API_ENDPOINTS.adminAccountDeletion);
    expect(req.request.headers.get('Authorization')).toBe('Bearer expired-token');
    expect(req.request.params.get('size')).toBe('20');
    req.flush({ success: true, data: { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 } });
  });
});
