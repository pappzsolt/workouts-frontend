import { Directive, Input, ElementRef, booleanAttribute, inject } from '@angular/core';

/** Presentation on the native input preserves ngModel, peer selectors and change events. */
@Directive({ selector: 'input[appCheckbox]', standalone: true, host: { '[class]': 'classes' } })
export class AppCheckboxDirective {
  @Input() appCheckbox: 'default' | 'selection' | 'plain' = 'default';
  private readonly input = inject<ElementRef<HTMLInputElement>>(ElementRef);
  @Input({ transform: booleanAttribute }) set indeterminate(value: boolean) {
    this.input.nativeElement.indeterminate = value;
  }
  get classes(): string {
    return this.appCheckbox === 'plain'
      ? ''
      : this.appCheckbox === 'selection'
        ? 'h-5 w-5 cursor-pointer rounded border-surface-300 accent-primary-600 focus:ring-2 focus:ring-primary-500/20'
        : 'h-4 w-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500';
  }
}
@Directive({ selector: 'input[appRadio]', standalone: true, host: { '[class]': 'classes' } })
export class AppRadioDirective {
  @Input() appRadio: 'default' | 'card' | 'plain' = 'default';
  get classes(): string {
    return this.appRadio === 'plain'
      ? ''
      : this.appRadio === 'card'
        ? 'peer sr-only'
        : 'h-4 w-4 border-surface-300 text-primary-600 focus:ring-primary-500';
  }
}
