import { Component } from '@angular/core';
import { Router } from '@angular/router';

import { SHARED_IMPORTS } from '../../shared/shared-imports';
import { DashboardActionComponent } from '../../shared/components/dashboard-action/dashboard-action.component';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [...SHARED_IMPORTS, DashboardActionComponent],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css'],
})
export class AdminDashboardComponent {
  message = '';
  messageType: 'success' | 'error' | 'info' = 'info';

  constructor(private router: Router) {}

  navigateTo(path: string): void {
    this.router.navigate([path]);
  }
}
