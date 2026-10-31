import { DashboardNavigationComponent } from '../../components/shared/components/dashboard-navigation/dashboard-navigation.component';
import { Component, OnInit, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { DynamicMenuComponent } from '../../components/dynamic-menu/dynamic-menu.component';
import { LanguageSelectorComponent } from '../../components/shared/language/language-selector.component';
import { AuthService } from '../../services/auth/auth.service';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AppButtonComponent } from '../../components/shared/components/app-button/app-button.component';
import { AppIconComponent } from '../../components/shared/components/app-icon/app-icon.component';
import { APP_VERSION } from '../../config/app-version';
import type { MenuItem } from '../../models/common/menu-item.model';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    TranslatePipe,
    AppButtonComponent,
    AppIconComponent,
    DynamicMenuComponent,
    LanguageSelectorComponent,
    DashboardNavigationComponent,
  ],
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.css'],
})
export class LayoutComponent implements OnInit {
  username: string | null = null;
  role: string | null = null;
  currentYear: number = new Date().getFullYear();
  currentDate: Date = new Date();
  readonly appVersion = APP_VERSION;

  menuOpen = false; // <-- hamburger menü állapota

  adminMenuItems: MenuItem[] = [
    { label: 'menu.adminDashboard', icon: 'house', path: '/admin/dashboard' },
    { label: 'menu.users', icon: 'users', path: '/admin/users' },
    { label: 'menu.registrations', icon: 'user-plus', path: '/admin/registrations' },
    { label: 'menu.loginAuditLogs', icon: 'list-checks', path: '/admin/login-audit-logs' },
    { label: 'menu.bugReports', icon: 'flag', path: '/admin/bug-reports' },
    { label: 'menu.logout', icon: 'log-out', action: 'logout' },
  ];

  coachMenuItems: MenuItem[] = [
    { label: 'menu.coachOverview', icon: 'house', path: '/coach/dashboard' },
    { label: 'menu.coachClients', icon: 'users', path: '/coach/clients' },
    { label: 'menu.coachPrograms', icon: 'clipboard-list', path: '/coach/programs' },
    { label: 'menu.coachWorkouts', icon: 'flame', path: '/coach/workouts' },
    { label: 'menu.coachExercises', icon: 'dumbbell', path: '/coach/exercises' },
    { label: 'menu.profile', icon: 'user-round', path: '/coach/profile' },
    { label: 'menu.bugReport', icon: 'triangle-alert', path: '/coach/bug-report' },
    { label: 'menu.logout', icon: 'log-out', action: 'logout' },
  ];

  userMenuItems: MenuItem[] = [
    { label: 'menu.dashboard', icon: 'house', path: '/user/dashboard' },
    { label: 'menu.profile', icon: 'user-round', path: '/user/profile' },
    { label: 'menu.bugReport', icon: 'triangle-alert', path: '/user/bug-report' },
    { label: 'menu.logout', icon: 'log-out', action: 'logout' },
  ];

  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.username = this.authService.getUserName();
    this.role = this.authService.getUserRole()
      ?.split(',')
      .map(role => role.trim().replace(/^ROLE_/i, ''))
      .join(', ') ?? null;

  }

  onLogout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  isCoach(): boolean {
    return this.authService.isCoach();
  }

  isUser(): boolean {
    return this.authService.isUser();
  }

  handleMenuAction(action: string): void {
    if (action === 'logout') {
      this.onLogout();
    }
  }

  // Mobil nézet ellenőrzése
  isMobile(): boolean {
    // Ugyanaz a határ, mint a CSS "sm" töréspontja (640px), és a CSS-hez hasonlóan a
    // látható ablakszélességet nézi: egy túl széles tartalom (innerWidth növekedése)
    // nem kapcsolhatja át asztali nézetre a menüt.
    return window.matchMedia('(max-width: 639.98px)').matches;
  }

  closeMobileMenu(): void {
    if (this.isMobile()) {
      this.menuOpen = false;
    }
  }

  @HostListener('window:resize', ['$event'])
  onResize(): void {
    if (!this.isMobile()) {
      this.menuOpen = false;
    }
  }
}
