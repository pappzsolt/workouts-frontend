import { Component, DestroyRef, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';

import { AuthService } from '../../services/auth/auth.service';
import { SHARED_IMPORTS } from '../shared/shared-imports';
import { LanguageSelectorComponent } from '../shared/language/language-selector.component';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [...SHARED_IMPORTS, ReactiveFormsModule, LanguageSelectorComponent],
  templateUrl: './forgot-password.component.html',
})
export class ForgotPasswordComponent {
  private readonly destroyRef = inject(DestroyRef);

  readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  loading = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
  ) {}

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage = 'forgotPassword.invalidEmail';
      this.successMessage = '';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.authService
      .requestPasswordReset(this.form.controls.email.value.trim())
      .pipe(
        catchError((error: unknown) => {
          const httpError = error as HttpErrorResponse;
          this.errorMessage =
            httpError.status === 503
              ? 'forgotPassword.serviceUnavailable'
              : 'forgotPassword.requestFailed';
          this.loading = false;
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((response) => {
        this.loading = false;

        if (response) {
          this.successMessage = response.message;
        }
      });
  }

  backToLogin(): void {
    void this.router.navigate(['/login']);
  }
}
