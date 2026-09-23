import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { PhosphorDuotoneIconName, PhosphorIconComponent } from '../phosphor-icon/phosphor-icon.component';

@Component({
  selector: 'app-dashboard-action',
  standalone: true,
  imports: [CommonModule, TranslatePipe, PhosphorIconComponent],
  templateUrl: './dashboard-action.component.html',
})
export class DashboardActionComponent {
  @Input({ required: true }) label = '';
  @Input({ required: true }) icon: PhosphorDuotoneIconName = 'barbell';
  @Input() tone: 'primary' | 'edit' | 'search' | 'add' | 'sort' = 'primary';
  @Output() activated = new EventEmitter<void>();

  getToneClasses(): string {
    const tones = {
      primary: 'bg-primary-50 text-primary-700',
      edit: 'bg-edit-50 text-edit-700',
      search: 'bg-search-50 text-search-700',
      add: 'bg-add-50 text-add-700',
      sort: 'bg-sort-50 text-sort-700',
    };
    return tones[this.tone];
  }
}
