import {
  ComponentRef,
  Directive,
  ElementRef,
  HostListener,
  Input,
  OnChanges,
  OnDestroy,
  ViewContainerRef,
  inject,
} from '@angular/core';
import { AbstractControl, ValidationErrors, Validator, Validators } from '@angular/forms';
import { MessageComponent } from '../message/message.component';

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;
export const PHONE_PATTERN = /^\+36\d{9}$/;

export function isValidDate(value: string, includeTime = false): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?)?$/.exec(
    value,
  );
  if (!match || includeTime !== (match[4] !== undefined)) return false;
  const [, year, month, day, hour, minute, second] = match;
  const y = Number(year),
    m = Number(month),
    d = Number(day);
  const leap = y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return (
    y > 0 &&
    m >= 1 &&
    m <= 12 &&
    d >= 1 &&
    d <= days[m - 1] &&
    (!includeTime || (Number(hour) < 24 && Number(minute) < 60 && Number(second ?? 0) < 60))
  );
}

export interface ValidationIssue {
  key: string;
  params?: Record<string, unknown>;
}

interface CheckableField {
  checkInput(): boolean;
}
const fields = new WeakMap<HTMLElement, CheckableField>();
export function registerValidationField(element: HTMLElement, field: CheckableField): () => void {
  fields.set(element, field);
  return () => fields.delete(element);
}

export function validateFields(
  host: HTMLElement,
  selector = 'input[appInput], textarea[appTextarea], app-select',
): boolean {
  let valid = true;
  for (const element of host.querySelectorAll<HTMLElement>(selector)) {
    if (fields.get(element)?.checkInput() === false) valid = false;
  }
  return valid;
}

/** Save handlers and automatic row saves use the same validators as typing. */
export function createInputValidationGuard(): (selector?: string) => boolean {
  let host: ElementRef<HTMLElement> | null = null;
  try {
    host = inject<ElementRef<HTMLElement>>(ElementRef, { optional: true, self: true });
  } catch (error) {
    // Non-rendered workflow tests can construct components outside Angular DI.
    if ((error as { code?: number }).code !== -203) throw error;
  }
  return (selector) => !host || validateFields(host.nativeElement, selector);
}

@Directive()
export abstract class FieldValidation implements Validator, OnChanges, OnDestroy {
  @Input() appValidation: '' | 'phone' | 'password' = '';
  @Input() appMatchValue: string | undefined;
  @Input() appMatchControl: AbstractControl | undefined;
  protected readonly element =
    inject<ElementRef<HTMLInputElement | HTMLTextAreaElement>>(ElementRef).nativeElement;
  private readonly container = inject(ViewContainerRef);
  private message?: ComponentRef<MessageComponent>;
  protected control?: AbstractControl;
  private validatorChanged = () => {};
  private interacted = false;
  private destroyed = false;
  private static nextId = 0;
  private readonly messageId = `input-validation-${FieldValidation.nextId++}`;
  private previousInvalid: string | null = null;
  private appliedInvalid = false;

  constructor() {
    fields.set(this.element, this);
  }

  validate(control: AbstractControl): ValidationErrors | null {
    this.control = control;
    const issue = this.getIssue(control.value);
    if (this.interacted)
      queueMicrotask(() => {
        if (!this.destroyed) this.checkInput();
      });
    return issue ? { inputType: issue.key } : null;
  }

  registerOnValidatorChange(fn: () => void): void {
    this.validatorChanged = fn;
  }

  ngOnChanges(): void {
    this.validatorChanged();
    if (this.interacted) this.checkInput();
  }

  protected getIssue(value: unknown): ValidationIssue | null {
    const element = this.element;
    if (element.disabled || element.readOnly || element.matches(':disabled')) return null;
    const type = element.type;
    if (element.validity.badInput)
      return { key: type === 'number' ? 'inputValidation.number' : 'inputValidation.date' };
    const required = element.required || this.control?.hasValidator(Validators.required);
    const empty = value == null || value === '';
    if (empty || (required && type !== 'password' && typeof value === 'string' && !value.trim())) {
      return required ? { key: 'inputValidation.required' } : null;
    }
    const text = String(value);
    if (type === 'email' && Validators.email({ value } as AbstractControl))
      return { key: 'inputValidation.email' };
    if (type === 'number') {
      const input = element as HTMLInputElement;
      const numberPattern = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/;
      if (
        !numberPattern.test(text) ||
        (input.value !== '' && !numberPattern.test(input.value)) ||
        !Number.isFinite(Number(value))
      ) {
        return { key: 'inputValidation.number' };
      }
      const number = Number(value);
      if ((!input.step || input.step === '1') && !Number.isInteger(number))
        return { key: 'inputValidation.integer' };
      if (input.min !== '' && number < Number(input.min))
        return { key: 'inputValidation.min', params: { min: input.min } };
      if (input.max !== '' && number > Number(input.max))
        return { key: 'inputValidation.max', params: { max: input.max } };
      const step = Number(input.step || '1');
      const base = Number(input.min || input.getAttribute('value') || '0');
      const steps = (number - base) / step;
      if (
        input.step !== 'any' &&
        step > 0 &&
        Math.abs(steps - Math.round(steps)) > Number.EPSILON * 8 * Math.max(1, Math.abs(steps))
      ) {
        return { key: 'inputValidation.step', params: { step: input.step || '1' } };
      }
    }
    if (type === 'date' || type === 'datetime-local') {
      const input = element as HTMLInputElement;
      if (!isValidDate(text, type === 'datetime-local')) return { key: 'inputValidation.date' };
      if (input.min && text < input.min)
        return { key: 'inputValidation.min', params: { min: input.min } };
      if (input.max && text > input.max)
        return { key: 'inputValidation.max', params: { max: input.max } };
    }
    if (this.appValidation === 'phone' && !PHONE_PATTERN.test(text))
      return { key: 'inputValidation.phone' };
    const minLength = this.appValidation === 'password' ? PASSWORD_MIN_LENGTH : element.minLength;
    const maxLength = this.appValidation === 'password' ? PASSWORD_MAX_LENGTH : element.maxLength;
    if (minLength > 0 && text.length < minLength)
      return { key: 'inputValidation.minLength', params: { min: minLength } };
    if (maxLength >= 0 && text.length > maxLength)
      return { key: 'inputValidation.maxLength', params: { max: maxLength } };
    if (
      element instanceof HTMLInputElement &&
      element.pattern &&
      Validators.pattern(element.pattern)({ value } as AbstractControl)
    ) {
      return {
        key: this.appValidation === 'phone' ? 'inputValidation.phone' : 'inputValidation.pattern',
      };
    }
    if (
      (this.appMatchControl !== undefined || this.appMatchValue !== undefined) &&
      text !== (this.appMatchControl ? this.appMatchControl.value : this.appMatchValue)
    )
      return { key: 'inputValidation.passwordMismatch' };
    return null;
  }

  checkInput(): boolean {
    this.interacted = true;
    const issue = this.getIssue(this.control ? this.control.value : this.element.value);
    this.showIssue(issue);
    return !issue;
  }

  @HostListener('input')
  onInput(): void {
    this.interacted = true;
    this.showIssue(this.getIssue(this.element.value));
  }

  @HostListener('blur')
  onBlur(): void {
    this.checkInput();
  }

  protected showIssue(issue: ValidationIssue | null): void {
    if (!issue && !this.message) return;
    if (!this.message) {
      this.message = this.container.createComponent(MessageComponent);
      this.element.insertAdjacentElement('afterend', this.message.location.nativeElement);
      this.message.setInput('compact', true);
      this.message.setInput('type', 'error');
      this.message.setInput('role', 'alert');
      this.message.setInput('ariaLive', 'polite');
      this.message.setInput('messageId', this.messageId);
    }
    this.message.setInput('messageParams', issue?.params ?? {});
    this.message.setInput('message', issue?.key ?? '');
    this.message.changeDetectorRef.detectChanges();
    const ids = (this.element.getAttribute('aria-describedby') ?? '')
      .split(/\s+/)
      .filter((id) => id && id !== this.messageId);
    if (issue) {
      if (!this.appliedInvalid) this.previousInvalid = this.element.getAttribute('aria-invalid');
      this.appliedInvalid = true;
      this.element.setAttribute('aria-invalid', 'true');
      ids.push(this.messageId);
    } else if (this.appliedInvalid) {
      if (this.previousInvalid === null) this.element.removeAttribute('aria-invalid');
      else this.element.setAttribute('aria-invalid', this.previousInvalid);
      this.appliedInvalid = false;
    }
    if (ids.length) this.element.setAttribute('aria-describedby', [...new Set(ids)].join(' '));
    else this.element.removeAttribute('aria-describedby');
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    fields.delete(this.element);
    this.message?.destroy();
  }
}
