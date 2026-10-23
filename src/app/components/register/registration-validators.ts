import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * A regisztrációs űrlap szabályai; a backend (RegistrationRequest) ugyanezeket ellenőrzi.
 */
export const REGISTRATION_LIMITS = {
  usernameMin: 3,
  usernameMaxUser: 50,
  usernameMaxCoach: 100,
  emailMax: 100,
  passwordMin: 8,
  passwordMaxBytes: 72,
  ageMin: 10,
  ageMax: 120,
  weightMin: 20,
  weightMax: 400,
  heightMin: 80,
  heightMax: 250,
  goalsMax: 2000,
  specializationMax: 500,
} as const;

const USERNAME_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N} ._-]*[\p{L}\p{N}]$/u;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Ugyanaz, mint az alkalmazás többi telefonszám-mezőjében: +36 és 9 számjegy. */
const PHONE_PATTERN = /^\+36\d{9}$/;

const isEmpty = (value: unknown): boolean => value === null || value === undefined || String(value).trim() === '';

/** Felhasználónév: betűvel/számmal kezdődik és végződik; betű, szám, szóköz, pont, kötőjel, aláhúzás. */
export const usernameFormat: ValidatorFn = (control: AbstractControl): ValidationErrors | null =>
  isEmpty(control.value) || USERNAME_PATTERN.test(String(control.value).trim()) ? null : { usernameFormat: true };

/** E-mail: van benne @ és a domainben pont. */
export const emailFormat: ValidatorFn = (control: AbstractControl): ValidationErrors | null =>
  isEmpty(control.value) || EMAIL_PATTERN.test(String(control.value).trim()) ? null : { emailFormat: true };

export const phoneFormat: ValidatorFn = (control: AbstractControl): ValidationErrors | null =>
  isEmpty(control.value) || PHONE_PATTERN.test(String(control.value).trim()) ? null : { phoneFormat: true };

/** Jelszó: legalább 8 karakter, legfeljebb 72 UTF-8 bájt, nem csak szóköz. */
export const passwordRules: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = String(control.value ?? '');
  if (!value) return null;
  if (value.trim() === '') return { passwordBlank: true };
  if (value.length < REGISTRATION_LIMITS.passwordMin) return { passwordTooShort: true };
  if (new TextEncoder().encode(value).length > REGISTRATION_LIMITS.passwordMaxBytes) return { passwordTooLong: true };
  return null;
};

/** Legfeljebb két tizedesjegy. */
export const maxTwoDecimals: ValidatorFn = (control: AbstractControl): ValidationErrors | null =>
  isEmpty(control.value) || /^\d+(\.\d{1,2})?$/.test(String(control.value)) ? null : { decimals: true };

export const integerOnly: ValidatorFn = (control: AbstractControl): ValidationErrors | null =>
  isEmpty(control.value) || Number.isInteger(Number(control.value)) ? null : { integer: true };

/** Csoportszintű: a két jelszó egyezzen. */
export const passwordsMatch: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const password = group.get('password')?.value ?? '';
  const confirmation = group.get('passwordConfirmation')?.value ?? '';
  return confirmation && password !== confirmation ? { passwordMismatch: true } : null;
};
