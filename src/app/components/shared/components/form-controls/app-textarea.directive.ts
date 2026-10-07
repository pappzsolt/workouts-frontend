import { Directive, Input } from '@angular/core';
import { TEXTAREA_STYLES } from './control-styles';

@Directive({ selector: 'textarea[appTextarea]', standalone: true, host: { '[class]': 'classes' } })
export class AppTextareaDirective {
  @Input() appTextarea: keyof typeof TEXTAREA_STYLES = 'default';
  get classes(): string {
    return TEXTAREA_STYLES[this.appTextarea];
  }
}
