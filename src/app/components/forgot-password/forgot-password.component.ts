import { createInputValidationGuard } from '../shared/components/form-controls/app-input.directive';
import { Component, DestroyRef, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { errorMessage } from '../../models/backend-dto/common/api-response-message';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';

import { AuthService } from '../../services/auth/auth.service';
import { AppFormValidationDirective } from '../shared/components/form-controls/app-form-validation.directive';
import { AppInputDirective } from '../shared/components/form-controls/app-input.directive';
import { AppHeadingDirective } from '../shared/components/app-page-header/app-page-header.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { MessageComponent } from '../shared/components/message/message.component';
import { AppButtonComponent } from '../shared/components/app-button/app-button.component';
import { FormFieldComponent } from '../shared/components/form-field/form-field.component';
import { LanguageSelectorComponent } from '../shared/language/language-selector.component';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [
    AppFormValidationDirective,
    AppInputDirective,
    AppHeadingDirective,
    CommonModule,
    FormsModule,
    TranslatePipe,
    MessageComponent,
    AppButtonComponent,
    FormFieldComponent,
    ReactiveFormsModule,
    LanguageSelectorComponent,
  ],
  templateUrl: './forgot-password.component.html',
})
export class ForgotPasswordComponent {
  private readonly validateInputs = createInputValidationGuard();
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
    if (!this.validateInputs()) return;
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
        finalize(() => { this.loading = false; }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: response => { this.successMessage = response.message; },
        error: error => {
          const fallback = error instanceof HttpErrorResponse && error.status === 503
            ? 'forgotPassword.serviceUnavailable' : 'forgotPassword.requestFailed';
          this.errorMessage = errorMessage(error, fallback);
        },
      });
  }

  backToLogin(): void {
    void this.router.navigate(['/login']);
  }
}
