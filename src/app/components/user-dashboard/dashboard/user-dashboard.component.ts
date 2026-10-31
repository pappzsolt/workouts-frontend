import { Component } from '@angular/core';
import { Router } from '@angular/router';

import { AppPageHeaderComponent } from '../../shared/components/app-page-header/app-page-header.component';
import { AppHeadingDirective } from '../../shared/components/app-page-header/app-page-header.component';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { DashboardActionComponent } from '../../shared/components/dashboard-action/dashboard-action.component';

@Component({
  selector: 'app-user-dashboard',
  standalone: true,
  imports: [AppPageHeaderComponent, AppHeadingDirective, CommonModule, TranslatePipe, DashboardActionComponent],
  templateUrl: './user-dashboard.component.html',
  styleUrls: ['./user-dashboard.component.css'],
})
export class UserDashboardComponent {
  constructor(private router: Router) {}

  navigateTo(path: string) {
    this.router.navigate([path]);
  }
}
