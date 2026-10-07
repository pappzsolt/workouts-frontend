import { Directive, Input } from '@angular/core';
import { INPUT_STYLES } from './control-styles';

@Directive({ selector: 'input[appInput]', standalone: true, host: { '[class]': 'classes' } })
export class AppInputDirective {
  @Input() appInput: keyof typeof INPUT_STYLES = 'default';
  get classes(): string {
    return INPUT_STYLES[this.appInput];
  }
}
