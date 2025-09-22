import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { LoginLayoutComponent } from './layouts/login-layout/login-layout.component';

import { AdminLayoutComponent } from './layouts/admin-layout/admin-layout.component';
import { CoachLayoutComponent } from './layouts/coach-layout/coach-layout.component';
import { UserLayoutComponent } from './layouts/user-layout/user-layout.component';

import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard.component';
import { AdminListUsersComponent } from './components/admin-list-users/admin-list-users.component';
import { CoachDashboardComponent } from './components/coach-dashboard/coach-dashboard.component';
import { CoachTrainingComponent } from './components/coach-training/coach-training.component'; // ← új komponens
import { UserDashboardComponent } from './components/user-dashboard/user-dashboard.component';

import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';

export const routes: Routes = [
  // Login layout
  {
    path: '',
    component: LoginLayoutComponent,
    children: [
      { path: 'login', component: LoginComponent },
      { path: '', redirectTo: 'login', pathMatch: 'full' }
    ]
  },

  // Admin layout
  {
    path: 'admin',
    component: AdminLayoutComponent,
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ROLE_ADMIN'] },
    children: [
      { path: 'dashboard', component: AdminDashboardComponent },
      { path: 'users', component: AdminListUsersComponent },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: '**', redirectTo: 'dashboard' }
    ]
  },

  // Coach layout
  {
    path: 'coach',
    component: CoachLayoutComponent,
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ROLE_COACH'] },
    children: [
      { path: 'dashboard', component: CoachDashboardComponent },
      { path: 'trainings', component: CoachTrainingComponent }, // ← új route
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: '**', redirectTo: 'dashboard' }
    ]
  },

  // User layout
  {
    path: 'user',
    component: UserLayoutComponent,
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ROLE_USER'] },
    children: [
      { path: 'dashboard', component: UserDashboardComponent },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: '**', redirectTo: 'dashboard' }
    ]
  },

  // Root wildcard
  { path: '**', redirectTo: 'login' }
];
