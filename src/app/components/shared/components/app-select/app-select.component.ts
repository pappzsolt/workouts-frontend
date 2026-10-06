import type { SelectOption, SelectValue } from '../../../../models/common/select-option.model';
import { Component, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { FormsModule, NgModel } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-select',
  standalone: true,
  host: { '[attr.id]': 'null' },
  imports: [FormsModule, TranslatePipe],
  templateUrl: './app-select.component.html',
  styleUrl: './app-select.component.css',
})
export class AppSelectComponent<T extends SelectValue = string> {
  @Input() id = '';
  @Input() name = '';

  @Input() value: T | undefined = undefined;

  @Input() options: SelectOption<T>[] = [];

  @Input() placeholder = '';
  @Input() placeholderValue: T | '' = '';
  @Input() placeholderDisabled = false;
  @Input() disabled = false;

  @Input() className =
    'block min-h-11 w-full min-w-0 rounded-xl border border-surface-300 bg-white px-3.5 py-2.5 text-base text-content-800 shadow-sm outline-none transition hover:border-surface-400 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 sm:text-sm disabled:cursor-not-allowed disabled:bg-surface-50 disabled:text-content-400 disabled:opacity-80';

  @ViewChild(NgModel) private model?: NgModel;

  @Output() valueChange = new EventEmitter<T>();

  reset(value?: T): void {
    this.value = value;
    this.model?.reset({ value, disabled: this.disabled });
  }

  onValueChange(value: T): void {
    this.valueChange.emit(value);
  }
}
