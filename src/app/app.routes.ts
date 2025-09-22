import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { LoginLayoutComponent } from './layouts/login-layout/login-layout.component';

import { AdminLayoutComponent } from './layouts/admin-layout/admin-layout.component';
import { CoachLayoutComponent } from './layouts/coach-layout/coach-layout.component';
import { UserLayoutComponent } from './layouts/user-layout/user-layout.component';

import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard.component';
import { CoachDashboardComponent } from './components/coach-dashboard/coach-dashboard.component';
import { UserDashboardComponent } from './components/user-dashboard/user-dashboard.component';

import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';

export const routes: Routes = [
  // Login oldal külön layoutban
  {
    path: '',
    component: LoginLayoutComponent,
    children: [
      { path: 'login', component: LoginComponent },
      { path: '', redirectTo: 'login', pathMatch: 'full' }
    ]
  },

  // ADMIN layout
  {
    path: '',
    component: AdminLayoutComponent,
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ROLE_ADMIN'] },
    children: [
      { path: 'admin/dashboard', component: AdminDashboardComponent },
      // további admin route-ok
    ]
  },

  // COACH layout
  {
    path: '',
    component: CoachLayoutComponent,
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ROLE_COACH'] },
    children: [
      { path: 'coach/dashboard', component: CoachDashboardComponent },
      // további coach route-ok
    ]
  },

  // USER layout
  {
    path: '',
    component: UserLayoutComponent,
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ROLE_USER'] },
    children: [
      { path: 'user/dashboard', component: UserDashboardComponent },
      // további user route-ok
    ]
  },

  // Minden más útvonal átirányítása a loginra
  { path: '**', redirectTo: 'login' }
];
