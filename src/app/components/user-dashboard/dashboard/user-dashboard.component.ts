import { Component } from '@angular/core';
import { Router } from '@angular/router';

import { SHARED_IMPORTS } from '../../shared/shared-imports';

@Component({
  selector: 'app-user-dashboard',
  standalone: true,
  imports: [...SHARED_IMPORTS],
  templateUrl: './user-dashboard.component.html',
  styleUrls: ['./user-dashboard.component.css'],
})
export class UserDashboardComponent {
  constructor(private router: Router) {}

  navigateTo(path: string) {
    this.router.navigate([path]);
  }
}
