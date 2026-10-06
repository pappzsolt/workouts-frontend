import { createEnvironmentInjector, EnvironmentInjector, Injector, runInInjectionContext } from '@angular/core';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable, Subject } from 'rxjs';
import { AuthService } from '../services/auth/auth.service';
import { authGuard } from './auth.guard';
import { roleGuard } from './role.guard';

describe('roleGuard', () => {
  let injector: EnvironmentInjector;
  let valid: boolean;
  let role: string | null;
  let refresh: Subject<string>;
  let router: jasmine.SpyObj<Router>;
  const route = { data: { roles: ['ROLE_USER'] } } as unknown as ActivatedRouteSnapshot;
  const state = {} as RouterStateSnapshot;

  beforeEach(() => {
    valid = false;
    role = null;
    refresh = new Subject<string>();
    router = jasmine.createSpyObj<Router>('Router', ['createUrlTree', 'navigate']);
    router.createUrlTree.and.callFake((commands) => commands[0] as unknown as UrlTree);
    injector = createEnvironmentInjector([
      { provide: AuthService, useValue: {
        hasValidAccessToken: () => valid,
        getUserRole: () => role,
        refreshAccessToken: () => refresh.asObservable(),
      } },
      { provide: Router, useValue: router },
    ], Injector.NULL as EnvironmentInjector);
  });

  afterEach(() => injector.destroy());

  it('waits alongside authGuard before evaluating the restored role', () => {
    const results: unknown[] = [];
    runInInjectionContext(injector, () => {
      (authGuard(route, state) as Observable<unknown>).subscribe(value => results.push(value));
      (roleGuard(route, state) as Observable<unknown>).subscribe(value => results.push(value));
    });
    expect(results).toEqual([]);
    expect(router.createUrlTree).not.toHaveBeenCalled();
    valid = true;
    role = 'ROLE_USER';
    refresh.next('restored-token');
    refresh.complete();
    expect(results).toEqual([true, true]);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('returns the login redirect when refresh fails', () => {
    let result: unknown;
    runInInjectionContext(injector, () => {
      (roleGuard(route, state) as Observable<unknown>).subscribe(value => result = value);
    });
    refresh.error(new Error('Unauthorized'));
    expect(result).toBe('/login');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('allows an existing token with an allowed role', () => {
    valid = true;
    role = 'ROLE_COACH, ROLE_USER';
    expect(runInInjectionContext(injector, () => roleGuard(route, state))).toBe(true);
  });

  for (const [userRole, destination] of [
    ['ROLE_ADMIN', '/admin/dashboard'],
    ['ROLE_COACH', '/coach/dashboard'],
    ['UNKNOWN', '/login'],
  ]) {
    it(`redirects ${userRole} to ${destination} without starting another navigation`, () => {
      valid = true;
      role = userRole;
      expect(runInInjectionContext(injector, () => roleGuard(route, state)) as unknown).toBe(destination);
      expect(router.navigate).not.toHaveBeenCalled();
    });
  }
});
