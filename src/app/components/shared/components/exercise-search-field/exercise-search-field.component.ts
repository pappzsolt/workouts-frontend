import type { SelectOption } from '../../../../models/common/select-option.model';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AppSelectComponent } from '../app-select/app-select.component';

@Component({
  selector: 'app-exercise-search-field',
  standalone: true,
  imports: [AppSelectComponent],
  templateUrl: './exercise-search-field.component.html',
  styleUrls: ['./exercise-search-field.component.css'],
})
export class ExerciseSearchFieldComponent {
  @Input() value = '';

  @Input() options: SelectOption[] = [];

  @Output() valueChange = new EventEmitter<string>();

  onValueChange(value: string): void {
    this.valueChange.emit(value);
  }
}
