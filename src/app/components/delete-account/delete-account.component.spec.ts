import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { Subject, of, throwError } from 'rxjs';
import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { DeleteAccountComponent } from './delete-account.component';
import { AccountDeletionService } from '../../services/account-deletion/account-deletion.service';
import { RecaptchaService } from '../../services/account-deletion/recaptcha.service';

// No external scripts or real CAPTCHA keys are used.
describe('Account deletion form', () => {
  const service = { config: jasmine.createSpy(), submit: jasmine.createSpy() };
  beforeEach(() => {
    service.config.and.returnValue(of({ appName: 'Workouts', captchaSiteKey: '', processingTime: '', retentionPolicy: '' }));
    service.submit.calls.reset();
    TestBed.configureTestingModule({ imports: [DeleteAccountComponent], providers: [provideRouter([]), provideTranslateService(),
      { provide: AccountDeletionService, useValue: service }, { provide: RecaptchaService, useValue: { load: jasmine.createSpy() } },
    ] });
  });
  function component() { return TestBed.createComponent(DeleteAccountComponent).componentInstance; }
  it('blocks missing consent, invalid email and missing CAPTCHA', () => {
    const c = component();
    c.form.patchValue({ email: 'a@example.com' }); c.captchaToken = 'token'; c.submit();
    c.form.patchValue({ confirmation: true, email: 'invalid' }); c.submit();
    c.form.patchValue({ email: 'a@example.com' }); c.captchaToken = ''; c.submit();
    expect(service.submit).not.toHaveBeenCalled();
  });
  it('prevents duplicate submission and reports acceptance without claiming deletion', () => {
    const pending = new Subject<any>(); service.submit.and.returnValue(pending);
    const c = component(); c.form.patchValue({ email: 'a@example.com', confirmation: true }); c.captchaToken = 'token';
    c.submit(); c.submit(); expect(service.submit).toHaveBeenCalledTimes(1);
    expect(c.success).toBeFalse(); pending.next({ success: true }); pending.complete();
    expect(c.success).toBeTrue(); expect(c.captchaToken).toBe('');
  });
  it('preserves form data and discards spent CAPTCHA after a rate limit', () => {
    service.submit.and.returnValue(throwError(() => new HttpErrorResponse({ status: 429, headers: new HttpHeaders({ 'Retry-After': '60' }) })));
    const c = component(); c.form.patchValue({ email: 'a@example.com', message: 'delete', confirmation: true }); c.captchaToken = 'token';
    c.submit();
    expect(c.form.controls.email.value).toBe('a@example.com'); expect(c.form.controls.message.value).toBe('delete');
    expect(c.captchaToken).toBe(''); expect(c.retryAfter).toBe('60'); expect(c.success).toBeFalse();
  });
});
