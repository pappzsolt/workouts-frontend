import { Directive, Input, forwardRef } from '@angular/core';
import { NG_VALIDATORS } from '@angular/forms';
import { TEXTAREA_STYLES } from './control-styles';
import { FieldValidation } from './field-validation';

@Directive({
  selector: 'textarea[appTextarea]',
  standalone: true,
  host: { '[class]': 'classes' },
  providers: [
    { provide: NG_VALIDATORS, useExisting: forwardRef(() => AppTextareaDirective), multi: true },
  ],
})
export class AppTextareaDirective extends FieldValidation {
  @Input() appTextarea: keyof typeof TEXTAREA_STYLES = 'default';
  get classes(): string {
    return TEXTAREA_STYLES[this.appTextarea];
  }
}
