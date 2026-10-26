import { HttpBackend, HttpClient, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { API_ENDPOINTS } from '../../api-endpoints';
import { AuthService } from './auth.service';

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
});
