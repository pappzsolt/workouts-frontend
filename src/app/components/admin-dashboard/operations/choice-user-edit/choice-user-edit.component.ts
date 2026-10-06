import { DashboardActionComponent } from '../../../shared/components/dashboard-action/dashboard-action.component';
import { Component } from '@angular/core';
import { Router } from '@angular/router';

import { SHARED_IMPORTS } from '../../../shared/shared-imports';

@Component({
  selector: 'app-choice-edit',
  standalone: true,
  imports: [...SHARED_IMPORTS, DashboardActionComponent],
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
