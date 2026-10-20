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
  @Output() activated = new EventEmitter<void>();
}
