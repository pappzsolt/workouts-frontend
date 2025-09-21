import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { LoginLayoutComponent } from './layouts/login-layout/login-layout.component';
import { MainLayoutComponent } from './layouts/main-layout/main-layout.component';
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

  // Fő tartalom védett layoutban
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard], // minden gyermek route védett
    children: [
      {
        path: 'dashboard',
        component: DashboardComponent,
        canActivate: [roleGuard],
        data: { roles: ['ROLE_ADMIN', 'ROLE_COACH','ROLE_USER'] } // csak admin és coach férhet hozzá
      },
      // Ide jöhetnek további védett route-ok
    ]
  },

  // Minden más útvonal átirányítása a loginra
  { path: '**', redirectTo: 'login' }
];
