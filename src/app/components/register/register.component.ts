import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

import type { RegistrationAccountType, RegistrationPayload } from '../../models/backend-dto/registration/registration';
import { errorMessage } from '../../models/backend-dto/common/api-response-message';
import type { SelectOption } from '../../models/common/select-option.model';
import { AuthService } from '../../services/auth/auth.service';
import { AppSelectComponent } from '../shared/components/app-select/app-select.component';
import { LanguageSelectorComponent } from '../shared/language/language-selector.component';
import { SHARED_IMPORTS } from '../shared/shared-imports';
import {
  REGISTRATION_LIMITS as L,
  emailFormat,
  integerOnly,
  maxTwoDecimals,
  passwordRules,
  passwordsMatch,
  phoneFormat,
  usernameFormat,
} from './registration-validators';

/**
 * Az űrlap saját szabályainak hibaüzenetei. A kötelezőséget, a hosszt, a számtartományt,
 * a lépésközt, az email formáját, a telefonszámot és a két jelszó egyezését a közös
 * mezőellenőrzés (appInput) jelzi a mező alatt; ezeket itt nem ismételjük.
 */
const ERROR_KEYS: Record<string, string> = {
  usernameFormat: 'register.errors.usernameFormat',
  emailFormat: 'register.errors.email',
  passwordBlank: 'register.errors.passwordBlank',
  passwordTooLong: 'register.errors.passwordTooLong',
  decimals: 'register.errors.decimals',
};

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [...SHARED_IMPORTS, ReactiveFormsModule, LanguageSelectorComponent, AppSelectComponent],
  templateUrl: './register.component.html',
})
export class RegisterComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly limits = L;

  readonly form = inject(FormBuilder).nonNullable.group(
    {
      accountType: ['USER' as RegistrationAccountType, Validators.required],
      username: ['', [Validators.required, Validators.minLength(L.usernameMin), Validators.maxLength(L.usernameMaxUser), usernameFormat]],
      email: ['', [Validators.required, Validators.maxLength(L.emailMax), Validators.email, emailFormat]],
      password: ['', [Validators.required, passwordRules]],
      passwordConfirmation: ['', Validators.required],
      age: ['', [Validators.min(L.ageMin), Validators.max(L.ageMax), integerOnly]],
      weight: ['', [Validators.min(L.weightMin), Validators.max(L.weightMax), maxTwoDecimals]],
      height: ['', [Validators.min(L.heightMin), Validators.max(L.heightMax), maxTwoDecimals]],
      gender: ['' as '' | 'MALE' | 'FEMALE'],
      goals: ['', Validators.maxLength(L.goalsMax)],
      phone: ['', phoneFormat],
      specialization: ['', Validators.maxLength(L.specializationMax)],
    },
    { validators: passwordsMatch },
  );

  readonly genderOptions: SelectOption<'' | 'MALE' | 'FEMALE'>[] = [
    { value: '', label: 'register.genderNotSpecified' },
    { value: 'MALE', label: 'register.genderMale' },
    { value: 'FEMALE', label: 'register.genderFemale' },
  ];

  loading = false;
  submitted = false;
  errorMessage = '';
  successMessage = '';

  constructor() {
    // Az edző neve hosszabb lehet, mint az ügyfél felhasználóneve.
    this.form.controls.accountType.valueChanges.pipe(takeUntilDestroyed()).subscribe((type) => {
      const username = this.form.controls.username;
      username.setValidators([
        Validators.required,
        Validators.minLength(L.usernameMin),
        Validators.maxLength(type === 'COACH' ? L.usernameMaxCoach : L.usernameMaxUser),
        usernameFormat,
      ]);
      username.updateValueAndValidity();
      // A másik fióktípus (most rejtett) mezői nem akadályozhatják a beküldést.
      const hidden = type === 'COACH'
        ? (['age', 'weight', 'height', 'gender', 'goals'] as const)
        : (['phone', 'specialization'] as const);
      for (const name of hidden) this.form.controls[name].reset('');
    });
  }

  get isCoach(): boolean {
    return this.form.controls.accountType.value === 'COACH';
  }

  setAccountType(type: RegistrationAccountType): void {
    this.form.controls.accountType.setValue(type);
  }

  /** A mező saját (appInput által nem jelzett) hibájának fordítási kulcsa, érintés vagy beküldés után. */
  fieldError(name: keyof typeof this.form.controls): string {
    const control: AbstractControl = this.form.controls[name];
    if (!(control.touched || this.submitted) || !control.errors || control.errors['inputType']) return '';
    const own = Object.keys(control.errors).find((key) => ERROR_KEYS[key]);
    return own ? ERROR_KEYS[own] : '';
  }

  submit(): void {
    this.submitted = true;
    this.errorMessage = '';
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage = 'register.errors.fixFields';
      return;
    }

    this.loading = true;
    this.authService
      .register(this.payload())
      .pipe(
        finalize(() => (this.loading = false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (message) => (this.successMessage = message),
        error: (error) => (this.errorMessage = errorMessage(error, 'register.failed')),
      });
  }

  backToLogin(): void {
    void this.router.navigate(['/login']);
  }

  /** Csak a választott fióktípus mezői kerülnek a kérésbe; az üres opcionális mező null. */
  private payload(): RegistrationPayload {
    const v = this.form.getRawValue();
    const text = (value: string): string | null => (value.trim() ? value.trim() : null);
    const num = (value: string | number): number | null => (String(value).trim() === '' ? null : Number(value));
    const base: RegistrationPayload = {
      accountType: v.accountType,
      username: v.username.trim(),
      email: v.email.trim(),
      password: v.password,
      passwordConfirmation: v.passwordConfirmation,
    };
    return this.isCoach
      ? { ...base, phone: text(v.phone), specialization: text(v.specialization) }
      : {
          ...base,
          age: num(v.age),
          weight: num(v.weight),
          height: num(v.height),
          gender: v.gender || null,
          goals: text(v.goals),
        };
  }
}
