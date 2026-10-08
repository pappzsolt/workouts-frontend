import { MessageComponent } from '../message/message.component';
import { CommonModule } from '@angular/common';
import {
  AfterContentChecked,
  Component,
  ElementRef,
  Input,
  Renderer2,
  inject,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

let nextFieldId = 0;

@Component({
  selector: 'app-form-field',
  standalone: true,
  imports: [CommonModule, TranslatePipe, MessageComponent],
  templateUrl: './form-field.component.html',
})
export class FormFieldComponent implements AfterContentChecked {
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);
  private readonly renderer = inject(Renderer2);
  private readonly fieldId = `form-field-${++nextFieldId}`;
  @Input({ required: true }) labelKey = '';
  @Input() controlId = '';
  @Input() required = false;
  @Input() labelSuffix = '';
  @Input() hint = '';
  @Input() error = '';
  @Input() showError = false;
  get hintId(): string {
    return `${this.fieldId}-hint`;
  }
  get errorId(): string {
    return `${this.fieldId}-error`;
  }
  private control?: HTMLElement;
  private previousInvalid: string | null = null;
  private appliedInvalid = false;

  ngAfterContentChecked(): void {
    const control = this.host.nativeElement.querySelector<HTMLElement>('input, select, textarea');
    if (!control) return;
    if (control !== this.control) {
      this.control = control;
      this.previousInvalid = control.getAttribute('aria-invalid');
      this.appliedInvalid = false;
    }
    const ids = (control.getAttribute('aria-describedby') ?? '')
      .split(/\s+/)
      .filter((id) => id && id !== this.hintId && id !== this.errorId);
    if (this.hint) ids.push(this.hintId);
    if (this.showError && this.error) ids.push(this.errorId);
    const description = [...new Set(ids)].join(' ');
    if (description !== (control.getAttribute('aria-describedby') ?? '')) {
      if (description) this.renderer.setAttribute(control, 'aria-describedby', description);
      else this.renderer.removeAttribute(control, 'aria-describedby');
    }
    if (this.showError && this.error) {
      if (!this.appliedInvalid) this.previousInvalid = control.getAttribute('aria-invalid');
      this.renderer.setAttribute(control, 'aria-invalid', 'true');
      this.appliedInvalid = true;
    } else if (this.appliedInvalid) {
      if (this.previousInvalid !== null)
        this.renderer.setAttribute(control, 'aria-invalid', this.previousInvalid);
      else this.renderer.removeAttribute(control, 'aria-invalid');
      this.appliedInvalid = false;
    }
  }
}
