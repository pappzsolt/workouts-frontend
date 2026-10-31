import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';

import { AppPageHeaderComponent } from '../../shared/components/app-page-header/app-page-header.component';
import { AppHeadingDirective } from '../../shared/components/app-page-header/app-page-header.component';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { MessageComponent } from '../../shared/components/message/message.component';
import { DashboardActionComponent } from '../../shared/components/dashboard-action/dashboard-action.component';
import { RegistrationRequestsService } from '../../../services/admin/registration-requests.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    AppPageHeaderComponent,
    AppHeadingDirective,
    CommonModule,
    TranslatePipe,
    MessageComponent,
    DashboardActionComponent,
  ],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css'],
})
export class AdminDashboardComponent {
  message = '';
  messageType: 'success' | 'error' | 'info' = 'info';

  /** Függő regisztrációs kérelmek száma (a kártya címkéjében). */
  pendingRegistrations = 0;

  constructor(private router: Router) {
    inject(RegistrationRequestsService)
      .pendingCount()
      .pipe(takeUntilDestroyed())
      .subscribe({ next: (count) => (this.pendingRegistrations = count), error: () => undefined });
  }

  navigateTo(path: string): void {
    this.router.navigate([path]);
  }
}
