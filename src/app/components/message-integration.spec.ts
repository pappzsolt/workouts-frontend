import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';
import { API_ENDPOINTS } from '../api-endpoints';
import { AuthService } from '../services/auth/auth.service';
import { CoachNameIdService } from '../services/coach/coach-name-id.service';
import { UserNameIdService } from '../services/user/user-name-id.service';
import { LanguageService } from '../services/shared/language.service';
import { LoggerService } from '../services/logger.service';
import { LoginComponent } from './login/login.component';
import { ForgotPasswordComponent } from './forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './reset-password/reset-password.component';
import { CoachSelectComponent } from './shared/coach/coach-select.component';
import { UserSelectComponent } from './shared/user/user-select.component';

const rejected = (message: string) => throwError(() => new HttpErrorResponse({ status: 403, error: { message } }));

describe('Shared messages in authentication and selectors', () => {
  let auth: jasmine.SpyObj<AuthService>;
  let coaches: jasmine.SpyObj<CoachNameIdService>;
  let users: jasmine.SpyObj<UserNameIdService>;
  beforeEach(() => {
    auth = jasmine.createSpyObj('AuthService', ['login', 'requestPasswordReset', 'resetPassword']);
    coaches = jasmine.createSpyObj('CoachNameIdService', ['getAllCoaches']);
    users = jasmine.createSpyObj('UserNameIdService', ['getAllUsers']);
    TestBed.configureTestingModule({
      imports: [LoginComponent, ForgotPasswordComponent, ResetPasswordComponent, CoachSelectComponent, UserSelectComponent],
      providers: [provideTranslateService(), provideRouter([]),
        { provide: AuthService, useValue: auth }, { provide: CoachNameIdService, useValue: coaches },
        { provide: UserNameIdService, useValue: users },
        { provide: LanguageService, useValue: { getCurrentLanguage: () => 'hu' } },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({ token: 'valid-token' }) } } },
        { provide: LoggerService, useValue: { error: () => undefined } },
      ],
    });
  });

  it('renders login backend errors through app-message without navigating', () => {
    const fixture = TestBed.createComponent(LoginComponent); fixture.detectChanges();
    auth.login.and.returnValue(rejected('Login denied'));
    const navigate = spyOn(TestBed.inject(Router), 'navigate');
    fixture.componentInstance.loginForm.setValue({ username: 'user', password: 'password' });
    fixture.componentInstance.onSubmit(); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-message').textContent).toContain('Login denied');
    expect(fixture.componentInstance.loading).toBeFalse(); expect(navigate).not.toHaveBeenCalled();
  });

  it('renders forgot-password success through app-message', () => {
    const fixture = TestBed.createComponent(ForgotPasswordComponent); fixture.detectChanges();
    auth.requestPasswordReset.and.returnValue(of({ message: 'Request accepted' }));
    fixture.componentInstance.form.setValue({ email: 'user@example.com' });
    fixture.componentInstance.submit(); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-message').textContent).toContain('Request accepted');
    expect(fixture.componentInstance.loading).toBeFalse();
  });

  it('renders forgot-password backend errors instead of replacing them', () => {
    const fixture = TestBed.createComponent(ForgotPasswordComponent); fixture.detectChanges();
    auth.requestPasswordReset.and.returnValue(rejected('Request denied'));
    fixture.componentInstance.form.setValue({ email: 'user@example.com' });
    fixture.componentInstance.submit(); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-message').textContent).toContain('Request denied');
    expect(fixture.componentInstance.successMessage).toBe('');
  });

  it('renders the reset-password response and completes only after success', () => {
    const fixture = TestBed.createComponent(ResetPasswordComponent); fixture.detectChanges();
    auth.resetPassword.and.returnValue(of({ success: true, data: null, message: 'Password saved' }));
    fixture.componentInstance.form.setValue({ newPassword: 'password123', confirmPassword: 'password123' });
    fixture.componentInstance.submit(); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-message').textContent).toContain('Password saved');
    expect(fixture.componentInstance.completed).toBeTrue(); expect(fixture.componentInstance.loading).toBeFalse();
  });

  it('renders a reset failure and leaves the form available', () => {
    const fixture = TestBed.createComponent(ResetPasswordComponent); fixture.detectChanges();
    auth.resetPassword.and.returnValue(rejected('Token denied'));
    fixture.componentInstance.form.setValue({ newPassword: 'password123', confirmPassword: 'password123' });
    fixture.componentInstance.submit(); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-message').textContent).toContain('Token denied');
    expect(fixture.componentInstance.completed).toBeFalse();
  });

  it('renders a user-list success:false message instead of just an empty dropdown', () => {
    users.getAllUsers.and.returnValue(of({ success: false, data: null, message: 'Users denied' }));
    const fixture = TestBed.createComponent(UserSelectComponent); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-message').textContent).toContain('Users denied');
    expect(fixture.componentInstance.messageType).toBe('error');
  });

  it('renders coach HTTP errors through app-message', () => {
    coaches.getAllCoaches.and.returnValue(rejected('Coaches denied'));
    const fixture = TestBed.createComponent(CoachSelectComponent); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-message').textContent).toContain('Coaches denied');
    expect(fixture.componentInstance.coaches).toEqual([]);
  });
});

describe('Responses passed to the shared messages', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('preserves the reset-password success message', () => {
    TestBed.inject(AuthService).resetPassword('token', 'password123').subscribe(response => {
      expect(response.message).toBe('Password saved');
    });
    http.expectOne(req => req.url === API_ENDPOINTS.authResetPassword).flush({ success: true, data: null, message: 'Password saved' });
  });

  it('rejects success:false reset responses using the backend message', () => {
    const failed = jasmine.createSpy('failed'); const succeeded = jasmine.createSpy('succeeded');
    TestBed.inject(AuthService).resetPassword('token', 'password123').subscribe({ next: succeeded, error: failed });
    http.expectOne(req => req.url === API_ENDPOINTS.authResetPassword).flush({ success: false, data: null, message: 'Token expired' });
    expect(succeeded).not.toHaveBeenCalled(); expect(failed.calls.mostRecent().args[0].message).toBe('Token expired');
  });

  it('preserves coach messages while mapping the dropdown options', () => {
    TestBed.inject(CoachNameIdService).getAllCoaches().subscribe(response => {
      expect(response.message).toBe('Coaches loaded'); expect(response.data).toEqual([{ id: 1, name: 'Coach' }]);
    });
    http.expectOne(API_ENDPOINTS.coachesNameId).flush({ success: true, message: 'Coaches loaded', data: [{ id: 1, name: 'Coach' }] });
  });
});
