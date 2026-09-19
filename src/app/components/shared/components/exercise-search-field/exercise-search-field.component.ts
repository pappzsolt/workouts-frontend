import { Component, EventEmitter, Input, Output } from '@angular/core';
import { SHARED_IMPORTS } from '../../shared-imports';

export interface SelectOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-exercise-search-field',
  standalone: true,
  imports: [...SHARED_IMPORTS],
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
