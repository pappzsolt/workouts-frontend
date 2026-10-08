import {
  ComponentRef,
  Directive,
  ElementRef,
  HostListener,
  Input,
  OnDestroy,
  ViewContainerRef,
  forwardRef,
  inject,
} from '@angular/core';
import {
  AbstractControl,
  NG_VALIDATORS,
  ValidationErrors,
  Validator,
  Validators,
} from '@angular/forms';
import { MessageComponent } from '../message/message.component';
import { INPUT_STYLES } from './control-styles';

const inputDirectives = new WeakMap<HTMLInputElement, AppInputDirective>();

/** A guard for the existing save handlers, including forms in child components. */
export function createInputValidationGuard(): (selector?: string) => boolean {
  // Non-rendered workflow tests have no element; rendered components always do.
  let host: ElementRef<HTMLElement> | null = null;
  try {
    host = inject<ElementRef<HTMLElement>>(ElementRef, { optional: true, self: true });
  } catch (error) {
    // NG0203 is possible when a workflow test constructs a component directly.
    if ((error as { code?: number }).code !== -203) throw error;
  }
  return (selector = 'input[appInput]') => {
    let valid = true;
    for (const input of host?.nativeElement.querySelectorAll<HTMLInputElement>(selector) ?? []) {
      const directive = inputDirectives.get(input);
      if (directive && !directive.checkInput()) valid = false;
    }
    return valid;
  };
}

@Directive({
  selector: 'input[appInput]',
  standalone: true,
  host: { '[class]': 'classes' },
  providers: [
    { provide: NG_VALIDATORS, useExisting: forwardRef(() => AppInputDirective), multi: true },
  ],
})
export class AppInputDirective implements Validator, OnDestroy {
  @Input() appInput: keyof typeof INPUT_STYLES = 'default';
  private readonly input = inject<ElementRef<HTMLInputElement>>(ElementRef).nativeElement;
  private readonly container = inject(ViewContainerRef);
  private message?: ComponentRef<MessageComponent>;
  private control?: AbstractControl;
  private readonly originalDescribedBy = this.input.getAttribute('aria-describedby');
  private readonly originalInvalid = this.input.getAttribute('aria-invalid');
  private static nextMessageId = 0;
  private readonly messageId = `input-validation-${AppInputDirective.nextMessageId++}`;

  constructor() {
    inputDirectives.set(this.input, this);
  }

  get classes(): string {
    return INPUT_STYLES[this.appInput];
  }

  validate(control: AbstractControl): ValidationErrors | null {
    this.control = control;
    const error = this.getError(control.value);
    return error ? { inputType: error } : null;
  }

  private getError(value: unknown): string {
    if (this.input.disabled || this.input.readOnly) return '';
    if (this.input.type === 'email') {
      return value != null && value !== '' && Validators.email({ value } as AbstractControl)
        ? 'inputValidation.email'
        : '';
    }
    if (this.input.type !== 'number') return '';
    if (this.input.validity.badInput) return 'inputValidation.number';
    // Empty optional fields retain their existing meaning.
    if (value == null || value === '') return '';
    const number = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(number)) return 'inputValidation.number';
    if (
      this.input.step !== 'any' &&
      (!this.input.step || this.input.step === '1') &&
      !Number.isInteger(number)
    ) {
      return 'inputValidation.integer';
    }
    if (this.input.min !== '' && number < Number(this.input.min)) return 'inputValidation.min';
    if (this.input.max !== '' && number > Number(this.input.max)) return 'inputValidation.max';
    return '';
  }

  checkInput(): boolean {
    const error = this.getError(this.control ? this.control.value : this.input.value);
    this.showMessage(error);
    return !error;
  }

  @HostListener('input')
  onInput(): void {
    // Read the DOM here: Angular's value accessor can run after this listener.
    this.showMessage(this.getError(this.input.value));
  }

  @HostListener('blur')
  onBlur(): void {
    this.checkInput();
  }

  @HostListener('keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (event.ctrlKey || event.metaKey || event.altKey || event.key.length !== 1) return;
    this.rejectText(event.key, event);
  }

  @HostListener('beforeinput', ['$event'])
  onBeforeInput(event: InputEvent): void {
    if (event.data && !event.isComposing) this.rejectText(event.data, event);
  }

  @HostListener('paste', ['$event'])
  onPaste(event: ClipboardEvent): void {
    const text = event.clipboardData?.getData('text');
    if (text) this.rejectText(text, event);
  }

  private rejectText(text: string, event: Event): void {
    if (this.input.type !== 'number' || this.input.disabled || this.input.readOnly) return;
    const integer = !this.input.step || this.input.step === '1';
    const decimalPattern = /^[+-]?\d*(?:\.\d*)?$/;
    let error = '';
    if (!decimalPattern.test(text)) error = 'inputValidation.number';
    else if (integer && text.includes('.')) error = 'inputValidation.integer';
    else if (this.input.min !== '' && Number(this.input.min) >= 0 && text.includes('-'))
      error = 'inputValidation.min';
    if (error) {
      event.preventDefault();
      this.showMessage(error);
    }
  }

  private showMessage(error: string): void {
    if (!error && !this.message) return;
    if (!this.message) {
      this.message = this.container.createComponent(MessageComponent);
      const element = this.message.location.nativeElement as HTMLElement;
      // Render the existing MessageComponent directly beside the affected input.
      this.input.insertAdjacentElement('afterend', element);
      this.message.setInput('compact', true);
      this.message.setInput('type', 'error');
      this.message.setInput('role', 'alert');
      this.message.setInput('ariaLive', 'polite');
      this.message.setInput('messageId', this.messageId);
    }
    this.message.setInput('messageParams', { min: this.input.min, max: this.input.max });
    this.message.setInput('message', error);
    this.message.changeDetectorRef.detectChanges();
    if (error) {
      this.input.setAttribute('aria-invalid', 'true');
      this.input.setAttribute(
        'aria-describedby',
        [this.originalDescribedBy, this.messageId].filter(Boolean).join(' '),
      );
    } else {
      this.restoreAttribute('aria-invalid', this.originalInvalid);
      this.restoreAttribute('aria-describedby', this.originalDescribedBy);
    }
  }

  private restoreAttribute(name: string, value: string | null): void {
    if (value === null) this.input.removeAttribute(name);
    else this.input.setAttribute(name, value);
  }

  ngOnDestroy(): void {
    inputDirectives.delete(this.input);
    this.message?.destroy();
  }
}
