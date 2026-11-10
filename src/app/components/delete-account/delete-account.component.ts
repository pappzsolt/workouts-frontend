import { AfterViewInit, Component, DestroyRef, ElementRef, NgZone, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageSelectorComponent } from '../shared/language/language-selector.component';
import { AccountDeletionService, DeletionConfig } from '../../services/account-deletion/account-deletion.service';
import { RecaptchaService, recaptchaApi } from '../../services/account-deletion/recaptcha.service';

@Component({
  selector: 'app-delete-account', standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslatePipe, LanguageSelectorComponent],
  templateUrl: './delete-account.component.html',
  styleUrl: './delete-account.component.css',
})
export class DeleteAccountComponent implements AfterViewInit {
  private readonly service = inject(AccountDeletionService);
  private readonly captcha = inject(RecaptchaService);
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);
  @ViewChild('captchaHost', { static: true }) captchaHost!: ElementRef<HTMLElement>;
  readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    message: ['', Validators.maxLength(2000)],
    confirmation: [false, Validators.requiredTrue],
  });
  private destroyed = false;
  constructor() { this.destroyRef.onDestroy(() => { this.destroyed = true; }); }
  config?: DeletionConfig;
  captchaToken = '';
  widget?: number;
  loading = false;
  configuring = true;
  success = false;
  error = '';
  retryAfter = '';

  ngAfterViewInit(): void {
    this.service.config().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: config => {
        this.config = config;
        this.configuring = false;
        if (!config.captchaSiteKey?.trim() || !config.appName?.trim() ||
            !config.processingTime?.trim() || !config.retentionPolicy?.trim()) {
          this.error = 'deleteAccount.errors.configuration';
          return;
        }
        void this.loadCaptcha();
      },
      error: () => { this.configuring = false; this.error = 'deleteAccount.errors.configuration'; },
    });
  }
  async loadCaptcha(): Promise<void> {
    if (!this.config?.captchaSiteKey || this.widget !== undefined) return;
    this.error = '';
    try {
      const api = await this.captcha.load();
      if (this.destroyed) return;
      this.zone.run(() => {
        this.widget = api.render(this.captchaHost.nativeElement, {
          sitekey: this.config!.captchaSiteKey,
          callback: token => this.zone.run(() => { this.captchaToken = token; this.error = ''; }),
          'expired-callback': () => this.zone.run(() => { this.captchaToken = ''; }),
          'error-callback': () => this.zone.run(() => { this.captchaToken = ''; this.error = 'deleteAccount.errors.captcha'; }),
        });
      });
    } catch {
      if (!this.destroyed) this.zone.run(() => { this.error = 'deleteAccount.errors.captcha'; });
    }
  }
  submit(): void {
    if (this.loading || this.success) return;
    this.form.markAllAsTouched();
    if (this.form.invalid || !this.captchaToken) {
      this.error = 'deleteAccount.errors.validation';
      return;
    }
    this.loading = true;
    this.error = '';
    this.retryAfter = '';
    const { email, message } = this.form.getRawValue();
    this.service.submit({ email: email.trim(), message: message.trim(), captchaToken: this.captchaToken })
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => { this.loading = false; this.success = true; this.form.reset(); this.resetCaptcha(); },
        error: error => {
          this.loading = false;
          this.resetCaptcha();
          this.error = error instanceof HttpErrorResponse && error.status === 429
            ? 'deleteAccount.errors.rateLimit' : 'deleteAccount.errors.submit';
          const retry = error instanceof HttpErrorResponse ? error.headers.get('Retry-After') : null;
          if (retry && /^\d+$/.test(retry)) this.retryAfter = retry;
        },
      });
  }
  resetCaptcha(): void {
    this.captchaToken = '';
    if (this.widget !== undefined) recaptchaApi()?.reset(this.widget);
  }
}
