import { createInputValidationGuard } from '../shared/components/form-controls/app-input.directive';
import type { LoginResponse } from '../../models/auth-model';

import { Component, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LoggerService } from '../../services/logger.service';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth/auth.service';
import { finalize } from 'rxjs';
import { errorMessage } from '../../models/backend-dto/common/api-response-message';
import { Router } from '@angular/router';
import { USER_MESSAGES } from '../../constants/user-messages';
import { SHARED_IMPORTS } from '../shared/shared-imports';
import { LanguageSelectorComponent } from '../shared/language/language-selector.component';


@Component({
  selector: 'app-login',
  standalone: true,
  imports: [...SHARED_IMPORTS, ReactiveFormsModule, LanguageSelectorComponent],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent {
  private readonly validateInputs = createInputValidationGuard();
  private readonly destroyRef = inject(DestroyRef);

  private readonly logger = inject(LoggerService);

  loginForm: FormGroup;
  errorMessage = '';
  loading = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
  ) {
    this.loginForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required],
    });
  }

  onSubmit(event?: Event) {
    if (!this.validateInputs()) return;
    if (event) event.preventDefault();

    if (this.loginForm.invalid) {
      this.errorMessage = USER_MESSAGES.required;
      return;
    }

    const { username, password } = this.loginForm.value;
    this.loading = true;
    this.errorMessage = '';

    this.authService
      .login(username, password)
      .pipe(
        finalize(() => { this.loading = false; }),
        takeUntilDestroyed(this.destroyRef),
      ).subscribe({ next: (res: LoginResponse) => {
        this.loading = false;

        if (res) {

          const role = this.authService.getUserRole() ?? '';

          if (role.includes('ROLE_ADMIN')) {
            this.router.navigate(['/admin/dashboard']);
          } else if (role.includes('ROLE_COACH')) {
            this.router.navigate(['/coach/dashboard']);
          } else if (role.includes('ROLE_USER')) {
            this.router.navigate(['/user/dashboard']);
          } else {
            this.router.navigate(['/login']);
          }
        }
      }, error: error => {
        this.logger.error('Login hiba:', error);
        this.errorMessage = errorMessage(error, USER_MESSAGES.userOrPassFailed);
      } });
  }
}
