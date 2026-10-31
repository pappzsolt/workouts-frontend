import { DashboardActionComponent } from '../../../shared/components/dashboard-action/dashboard-action.component';
import { Component } from '@angular/core';
import { Router } from '@angular/router';

import { AppHeadingDirective } from '../../../shared/components/app-page-header/app-page-header.component';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { MessageComponent } from '../../../shared/components/message/message.component';

@Component({
  selector: 'app-choice-edit',
  standalone: true,
  imports: [AppHeadingDirective, CommonModule, TranslatePipe, MessageComponent, DashboardActionComponent],
  templateUrl: './choice-user-edit.component.html',
  styleUrls: ['./choice-user-edit.component.css'],
})
export class ChoiceUserEditComponent {
  message = '';

  messageType: 'success' | 'error' | '' = '';

  constructor(private router: Router) {}

  navigateTo(path: string): void {
    this.router.navigate([path]);
  }
}
