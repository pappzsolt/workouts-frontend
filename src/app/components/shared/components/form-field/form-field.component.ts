import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-form-field',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './form-field.component.html',
})
export class FormFieldComponent {
  @Input({ required: true }) labelKey = '';
  @Input() controlId = '';
  @Input() required = false;
  @Input() labelSuffix = '';
}
