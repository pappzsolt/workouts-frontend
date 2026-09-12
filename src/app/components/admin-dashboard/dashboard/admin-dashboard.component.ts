import { Component } from '@angular/core';
import { Router } from '@angular/router';

import { SHARED_IMPORTS } from '../../shared/shared-imports';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [...SHARED_IMPORTS],
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
