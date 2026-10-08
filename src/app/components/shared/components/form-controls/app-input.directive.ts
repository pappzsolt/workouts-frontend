import { Directive, HostListener, Input, forwardRef } from '@angular/core';
import { NG_VALIDATORS } from '@angular/forms';
import { INPUT_STYLES } from './control-styles';
import { FieldValidation } from './field-validation';
export { createInputValidationGuard } from './field-validation';

@Directive({
  selector: 'input[appInput]',
  standalone: true,
  host: { '[class]': 'classes' },
  providers: [
    { provide: NG_VALIDATORS, useExisting: forwardRef(() => AppInputDirective), multi: true },
  ],
})
export class AppInputDirective extends FieldValidation {
  @Input() appInput: keyof typeof INPUT_STYLES = 'default';
  private get input(): HTMLInputElement {
    return this.element as HTMLInputElement;
  }
  get classes(): string {
    return INPUT_STYLES[this.appInput];
  }

  @HostListener('keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (event.ctrlKey || event.metaKey || event.altKey || event.key.length !== 1) return;
    if (!this.rejectText(event.key, event) && event.key === ',' && this.input.type === 'number') {
      event.preventDefault();
      this.insertNumberText('.');
    }
  }

  @HostListener('beforeinput', ['$event'])
  onBeforeInput(event: InputEvent): void {
    if (!event.data || event.isComposing) return;
    if (
      !this.rejectText(event.data, event) &&
      event.data.includes(',') &&
      this.input.type === 'number'
    ) {
      event.preventDefault();
      this.insertNumberText(event.data.replace(',', '.'));
    }
  }

  @HostListener('paste', ['$event'])
  onPaste(event: ClipboardEvent): void {
    const text = event.clipboardData?.getData('text');
    if (!text) return;
    if (!this.rejectText(text, event) && text.includes(',') && this.input.type === 'number') {
      event.preventDefault();
      this.insertNumberText(text.replace(',', '.'));
    }
  }

  @HostListener('drop', ['$event'])
  onDrop(event: DragEvent): void {
    const text = event.dataTransfer?.getData('text');
    if (
      text &&
      !this.rejectText(text, event) &&
      text.includes(',') &&
      this.input.type === 'number'
    ) {
      event.preventDefault();
      this.insertNumberText(text.replace(',', '.'));
    }
  }

  private rejectText(text: string, event: Event): boolean {
    if (this.input.type !== 'number' || this.input.disabled || this.input.readOnly) return false;
    const integer = !this.input.step || this.input.step === '1';
    let key = '';
    if (!/^[+-]?\d*(?:[.,]\d*)?$/.test(text)) key = 'inputValidation.number';
    else if (integer && /[.,]/.test(text)) key = 'inputValidation.integer';
    else if (this.input.min !== '' && Number(this.input.min) >= 0 && text.includes('-'))
      key = 'inputValidation.min';
    if (key) {
      event.preventDefault();
      this.showIssue({ key, params: { min: this.input.min } });
    }
    return !!key;
  }

  private insertNumberText(text: string): void {
    // Native insertion retains the number control, caret, undo and Angular's number accessor.
    const document = this.input.ownerDocument;
    if (
      typeof document.execCommand === 'function' &&
      document.execCommand('insertText', false, text)
    )
      return;
    // Fallback for browsers without native insertion: keep the model numeric.
    const value = text === '.' ? `${this.input.value}.` : text;
    if (value.endsWith('.')) {
      this.showIssue({ key: 'inputValidation.decimalSeparator' });
      return;
    }
    this.input.value = value;
    this.input.dispatchEvent(new Event('input', { bubbles: true }));
  }
}
