import { HttpBackend, HttpClient, HttpRequest, HttpResponse, HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { API_ENDPOINTS } from '../../api-endpoints';
import { AuthService } from './auth.service';
import { AuthInterceptor } from '../../interceptors/auth.interceptor';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

describe('AuthService cross-tab refresh', () => {
  let http: HttpTestingController;
  let first: AuthService;
  let second: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    const newTab = () => TestBed.runInInjectionContext(() =>
      new AuthService(TestBed.inject(HttpClient), TestBed.inject(HttpBackend)));
    first = newTab();
    second = newTab();
    // Model the origin-wide lock shared by independent service instances.
    let queue = Promise.resolve();
    spyOn(navigator.locks, 'request').and.callFake(((name: string, callback: () => Promise<unknown>) => {
      expect(name).toBe('workouts-auth-refresh');
      const result = queue.then(() => callback());
      queue = result.then(() => undefined, () => undefined);
      return result;
    }) as typeof navigator.locks.request);
  });

  afterEach(() => http.verify());

  for (const fails of [false, true]) {
    it(`serializes tabs and releases the lock after ${fails ? 'failure' : 'success'}`, fakeAsync(() => {
      first.refreshAccessToken().subscribe({ error: () => {} });
      second.refreshAccessToken().subscribe();
      flushMicrotasks();
      const initial = http.expectOne(request => request.url === API_ENDPOINTS.authWebRefresh);
      expect(initial.request.withCredentials).toBeTrue();
      http.expectNone(request => request.url === API_ENDPOINTS.authWebRefresh);
      if (fails) initial.flush(null, { status: 401, statusText: 'Unauthorized' });
      else initial.flush({ success: true, data: { accessToken: 'first-token' } });
      flushMicrotasks();
      http.expectOne(request => request.url === API_ENDPOINTS.authWebRefresh)
        .flush({ success: true, data: { accessToken: 'second-token' } });
      flushMicrotasks();
      expect(second.getAccessToken()).toBe('second-token');
    }));
  }

  it('does not start a queued refresh after logout', fakeAsync(() => {
    first.refreshAccessToken().subscribe();
    second.refreshAccessToken().subscribe({ error: () => {} });
    flushMicrotasks();
    const initial = http.expectOne(request => request.url === API_ENDPOINTS.authWebRefresh);
    second.logout();
    http.expectOne(request => request.url === API_ENDPOINTS.authWebLogout).flush({ success: true });
    initial.flush({ success: true, data: { accessToken: 'first-token' } });
    flushMicrotasks();
    http.expectNone(request => request.url === API_ENDPOINTS.authWebRefresh);
    expect(second.getAccessToken()).toBeNull();
  }));
  for (const fails of [false, true]) {
    it(`shares guard and parallel interceptor refresh with ${fails ? 'one failure callback' : 'independent retries'}`, fakeAsync(() => {
      const router = {navigate: jasmine.createSpy('navigate')};
      const interceptor = new AuthInterceptor(first, router as unknown as Router);
      const logout = spyOn(first, 'logout').and.callThrough();
      let errors = 0;
      let successes = 0;
      // A guard can already be restoring the session before API requests return 401.
      first.refreshAccessToken().subscribe({error: () => errors++});
      const calls = new Map<string, number>();
      const handler = {handle: (request: HttpRequest<unknown>) => {
        const count = (calls.get(request.url) ?? 0) + 1;
        calls.set(request.url, count);
        if (count === 1) return throwError(() => new HttpErrorResponse({status: 401}));
        expect(request.headers.get('Authorization')).toBe('Bearer renewed');
        return request.url.endsWith('/first')
          ? throwError(() => new HttpErrorResponse({status: 500}))
          : of(new HttpResponse({status: 200}));
      }};
      for (const suffix of ['first', 'second']) {
        interceptor.intercept(new HttpRequest('GET', `${API_ENDPOINTS.workouts}/${suffix}`), handler)
          .subscribe({next: () => successes++, error: () => errors++});
      }
      flushMicrotasks();
      const refresh = http.expectOne(request => request.url === API_ENDPOINTS.authWebRefresh);
      if (fails) refresh.flush(null, {status: 401, statusText: 'Unauthorized'});
      else refresh.flush({success: true, data: {accessToken: 'renewed'}});
      flushMicrotasks();
      if (fails) {
        expect(logout).toHaveBeenCalledTimes(1);
        expect(router.navigate).toHaveBeenCalledOnceWith(['/login']);
        expect(errors).toBe(3);
        http.expectOne(request => request.url === API_ENDPOINTS.authWebLogout).flush({success: true});
      } else {
        expect(logout).not.toHaveBeenCalled();
        expect(router.navigate).not.toHaveBeenCalled();
        expect(successes).toBe(1);
        expect(errors).toBe(1);
      }
    }));
  }

});
