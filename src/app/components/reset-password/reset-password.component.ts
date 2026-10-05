import { Component, DestroyRef, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';

import { AuthService } from '../../services/auth/auth.service';
import { SHARED_IMPORTS } from '../shared/shared-imports';
import { LanguageSelectorComponent } from '../shared/language/language-selector.component';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [...SHARED_IMPORTS, ReactiveFormsModule, LanguageSelectorComponent],
  templateUrl: './reset-password.component.html',
})
export class ResetPasswordComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);

  readonly form = inject(FormBuilder).nonNullable.group({
    newPassword: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]],
    confirmPassword: ['', [Validators.required]],
  });

  readonly token: string;
  loading = false;
  errorMessage = '';
  successMessage = '';
  completed = false;

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
  ) {
    this.token = this.route.snapshot.queryParamMap.get('token')?.trim() ?? '';

    if (!this.token) {
      this.errorMessage = 'resetPassword.invalidLink';
    }
  }

  submit(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.token) {
      this.errorMessage = 'resetPassword.invalidLink';
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage = 'resetPassword.passwordLength';
      return;
    }

    const newPassword = this.form.controls.newPassword.value;
    const confirmPassword = this.form.controls.confirmPassword.value;

    if (newPassword !== confirmPassword) {
      this.errorMessage = 'resetPassword.passwordMismatch';
      return;
    }

    this.loading = true;

    this.authService
      .resetPassword(this.token, newPassword)
      .pipe(
        catchError((error: unknown) => {
          const httpError = error as HttpErrorResponse;
          this.errorMessage =
            httpError.status === 400
              ? (httpError.error?.message ?? 'resetPassword.invalidToken')
              : httpError.status === 503
                ? 'resetPassword.serviceUnavailable'
                : 'resetPassword.resetFailed';
          this.loading = false;
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((response) => {
        this.loading = false;

        if (response === undefined) {
          this.completed = true;
          this.successMessage = 'resetPassword.success';
        }
      });
  }

  backToLogin(): void {
    void this.router.navigate(['/login']);
  }
}
