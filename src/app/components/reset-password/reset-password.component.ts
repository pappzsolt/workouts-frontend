import { Component, DestroyRef, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { errorMessage, responseMessage } from '../../models/backend-dto/common/api-response-message';
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
        finalize(() => { this.loading = false; }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: response => {
          this.completed = true;
          this.successMessage = responseMessage([response], 'resetPassword.success');
        },
        error: error => {
          const status = error instanceof HttpErrorResponse ? error.status : undefined;
          const fallback = status === 400 ? 'resetPassword.invalidToken'
            : status === 503 ? 'resetPassword.serviceUnavailable' : 'resetPassword.resetFailed';
          this.errorMessage = errorMessage(error, fallback);
        },
      });
  }

  backToLogin(): void {
    void this.router.navigate(['/login']);
  }
}
