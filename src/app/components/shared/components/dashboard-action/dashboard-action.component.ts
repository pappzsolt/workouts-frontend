import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-dashboard-action',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './dashboard-action.component.html',
})
export class DashboardActionComponent {
  @Input({ required: true }) label = '';
  @Input({ required: true }) icon = '';
  @Output() activated = new EventEmitter<void>();
}
