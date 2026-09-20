import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

export interface AppSelectOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-select',
  standalone: true,
  imports: [FormsModule, TranslatePipe],
  templateUrl: './app-select.component.html',
  styleUrl: './app-select.component.css',
})
export class AppSelectComponent {
  @Input() id = '';
  @Input() name = '';

  @Input() value: string | undefined = '';

  @Input() options: AppSelectOption[] = [];

  @Input() placeholder = '';
  @Input() placeholderValue = '';

  @Input() className =
    'block w-full rounded-lg border border-surface-300 bg-white px-3.5 py-2.5 text-base text-content-800 shadow-sm outline-none transition hover:border-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 sm:text-sm';

  @Output() valueChange = new EventEmitter<string>();

  onValueChange(value: string): void {
    this.valueChange.emit(value);
  }
}
