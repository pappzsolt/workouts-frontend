import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { AppIconComponent, AppIconName } from '../app-icon/app-icon.component';

@Component({
  selector: 'app-dashboard-action',
  standalone: true,
  imports: [CommonModule, TranslatePipe, AppIconComponent],
  templateUrl: './dashboard-action.component.html',
})
export class DashboardActionComponent {
  @Input({ required: true }) label = '';
  @Input({ required: true }) icon: AppIconName = 'activity';
  @Output() activated = new EventEmitter<void>();
}
