import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { routes } from './app.routes';
import { AuthService } from './services/auth/auth.service';
import { CoachWorkspaceService } from './services/coach/coach-workspace.service';
import { RegistrationRequestsService } from './services/admin/registration-requests.service';

 describe('Application lazy route navigation', () => {
  it('renders public and role-specific pages and preserves forbidden-route redirects', async () => {
    let role = 'ROLE_USER';
    const auth = {
      hasValidAccessToken: () => true,
      getUserRole: () => role,
      getUserName: () => 'Tester',
      isAdmin: () => role === 'ROLE_ADMIN',
      isCoach: () => role === 'ROLE_COACH',
      isUser: () => role === 'ROLE_USER',
      refreshAccessToken: jasmine.createSpy(),
    };
    TestBed.configureTestingModule({providers: [
      provideRouter(routes), provideTranslateService(),
      {provide: AuthService, useValue: auth},
      {provide: RegistrationRequestsService, useValue: {pendingCount: () => of(0)}},
      {provide: CoachWorkspaceService, useValue: {
        getOverview: () => of({clients: []}),
        getCoachPrograms: () => of([]), assignmentCounts: () => of({}),
      }},
    ]});
    const harness = await RouterTestingHarness.create();
    const expectPage = async (url: string, selector: string) => {
      await harness.navigateByUrl(url);
      harness.detectChanges();
      expect(harness.routeNativeElement?.querySelector(selector)).withContext(url).not.toBeNull();
    };
    await expectPage('/forgot-password', 'app-forgot-password');
    await expectPage('/reset-password?token=example', 'app-reset-password');
    await expectPage('/user/dashboard', 'app-user-dashboard');
    await expectPage('/admin/dashboard', 'app-user-dashboard');
    expect(TestBed.inject(Router).url).toBe('/user/dashboard');
    role = 'ROLE_ADMIN';
    await expectPage('/admin/dashboard', 'app-admin-dashboard');
    role = 'ROLE_COACH';
    await expectPage('/coach/dashboard', 'app-coach-home');
    await expectPage('/coach/programs', 'app-coach-programs');
    expect(auth.refreshAccessToken).not.toHaveBeenCalled();
  });
});
