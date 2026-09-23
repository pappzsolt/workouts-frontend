import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

export type DashboardActionSize = 'compact' | 'regular';

@Component({
  selector: 'app-dashboard-action',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './dashboard-action.component.html',
})
export class DashboardActionComponent {
  @Input({ required: true }) label = '';
  @Input({ required: true }) icon = '';
  @Input() size: DashboardActionSize = 'regular';
  @Output() activated = new EventEmitter<void>();
}
