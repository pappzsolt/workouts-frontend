import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { LoginLayoutComponent } from './layouts/login-layout/login-layout.component';

import { AdminLayoutComponent } from './layouts/admin-layout/admin-layout.component';
import { CoachLayoutComponent } from './layouts/coach-layout/coach-layout.component';
import { UserLayoutComponent } from './layouts/user-layout/user-layout.component';

import { AdminDashboardComponent } from './components/admin-dashboard/dashboard/admin-dashboard.component';
import { AdminListUsersComponent } from './components/admin-dashboard/operations/admin-list-users/admin-list-users.component';
import { CoachDashboardComponent } from './components/coach-dashboard/dashboard/coach-dashboard.component';
import { CoachTrainingComponent } from './components/coach-dashboard/operations/coach-training/coach-training.component'; // ← új komponens
import { UserDashboardComponent } from './components/user-dashboard/dashboard/user-dashboard.component';

import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';
import {UserSearchComponent} from './components/admin-dashboard/operations/user-search/user-search.component';
import {UserNewComponent} from './components/admin-dashboard/operations/user-new/user-new.component';
import {UserEditComponent} from './components/admin-dashboard/operations/user-edit/user-edit.component';
import {
  CoachExercisesComponent
} from './components/coach-dashboard/operations/coach-exercises/coach-exercises.component';
import {CoachProgramsComponent} from './components/coach-dashboard/operations/coach-programs/coach-programs.component';
import {CoachWorkoutsComponent} from './components/coach-dashboard/operations/coach-workouts/coach-workouts.component';
import {UserProfileComponent} from './components/user-dashboard/operations/user-profile/user-profile.component';
import {
  UserMyProgramsComponent
} from './components/user-dashboard/operations/user-my-programs/user-my-programs.component';
import {
  UserStatisticsComponent
} from './components/user-dashboard/operations/user-statistics/user-statistics.component';

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
      { path: 'users/search', component: UserSearchComponent },
      { path: 'users/new', component:  UserNewComponent},
      { path: 'users/edit', component:  UserEditComponent},
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
      { path: 'exercises', component: CoachExercisesComponent },
      { path: 'programs', component: CoachProgramsComponent },
      { path: 'workouts', component: CoachWorkoutsComponent },
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
      { path: 'profile', component: UserProfileComponent },
      { path: 'my-programs', component: UserMyProgramsComponent },
      { path: 'statistics', component: UserStatisticsComponent },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: '**', redirectTo: 'dashboard' }
    ]
  },

  // Root wildcard
  { path: '**', redirectTo: 'login' }
];
