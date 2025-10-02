import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { LoginLayoutComponent } from './layouts/login-layout/login-layout.component';
import { LayoutComponent } from './layouts/default-layout/layout.component'; // közös layout
import { AdminDashboardComponent } from './components/admin-dashboard/dashboard/admin-dashboard.component';
import { AdminListUsersComponent } from './components/admin-dashboard/operations/admin-list-users/admin-list-users.component';
import { CoachDashboardComponent } from './components/coach-dashboard/dashboard/coach-dashboard.component';
import { CoachWorkoutsComponent } from './components/coach-dashboard/operations/coach-workouts/coach-workouts.component';
import { UserDashboardComponent } from './components/user-dashboard/dashboard/user-dashboard.component';
import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';
import { MemberSearchComponent } from './components/admin-dashboard/operations/user-search/member-search.component';
import { ChoiceUserNewComponent } from './components/admin-dashboard/operations/choice-user-new/choice-user-new.component';
import { ChoiceUserEditComponent } from './components/admin-dashboard/operations/choice-user-edit/choice-user-edit.component';
import { CoachExercisesComponent } from './components/coach-dashboard/operations/coach-exercises/coach-exercises.component';
import { UserProfileComponent } from './components/user-dashboard/operations/user-profile/user-profile.component';
import { UserMyProgramsComponent } from './components/user-dashboard/operations/user-my-programs/user-my-programs.component';
import { UserStatisticsComponent } from './components/user-dashboard/operations/user-statistics/user-statistics.component';
import { CoachProfileComponent } from './components/coach-dashboard/operations/coach-profile/coach-profile.component';
import { CoachNewComponent } from './components/admin-dashboard/operations/coach-new/coach-new.component';
import { UserNewComponent } from './components/admin-dashboard/operations/user-new/user-new.component';
import { CoachEditComponent } from './components/admin-dashboard/operations/coach-edit/coach-edit.component';
import { UserEditComponent } from './components/admin-dashboard/operations/user-edit/user-edit.component';
import { WorkoutsComponent } from './components/user-dashboard/operations/user-workouts/workouts.component';
import { UserExercisesComponent } from './components/user-dashboard/operations/user-exercises/user-exercises.component';
import { UserExerciseDetailComponent } from './components/user-dashboard/operations/user-exercises/user-exercises-detail/user-exercises-detail.component';
import { CoachWorkoutEditComponent } from './components/coach-dashboard/operations/coach-workouts/coach-workouts-edit/coach-workout-edit.component';
import { CoachExerciseEditComponent } from './components/coach-dashboard/operations/coach-exercises/coach-exercise-edit/coach-exercise-edit.component';
import { CoachNewProgramComponent } from './components/coach-dashboard/operations/coach-programs/coach-new-program/coach-new-program.component';
import { CoachNewWorkoutComponent } from './components/coach-dashboard/operations/coach-workouts/coach-new-workout/coach-new-workout.component';
import {
  CoachProgramEditComponent
} from './components/coach-dashboard/operations/coach-programs/coach-program-edit/coach-program-edit.component';

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

  // Admin routes using common LayoutComponent
  {
    path: 'admin',
    component: LayoutComponent,
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ROLE_ADMIN'] },
    children: [
      { path: 'dashboard', component: AdminDashboardComponent },
      { path: 'users', component: AdminListUsersComponent },
      { path: 'users/search', component: MemberSearchComponent },
      { path: 'choice-users/edit', component: ChoiceUserEditComponent },
      { path: 'choice-users/new', component: ChoiceUserNewComponent },
      { path: 'users/new', component: UserNewComponent },
      { path: 'coach/new', component: CoachNewComponent },
      { path: 'coach/edit', component: CoachEditComponent },
      { path: 'users/edit', component: UserEditComponent },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: '**', redirectTo: 'dashboard' }
    ]
  },

  // Coach routes using common LayoutComponent
  {
    path: 'coach',
    component: LayoutComponent,
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ROLE_COACH'] },
    children: [
      { path: 'dashboard', component: CoachDashboardComponent },
      { path: 'profile', component: CoachProfileComponent },
      { path: 'exercises', component: CoachExercisesComponent },
      { path: 'programs/:id/workouts', component: CoachWorkoutsComponent },
      { path: 'workouts', component: CoachWorkoutsComponent },
      { path: 'programs/new', component: CoachNewProgramComponent },
      { path: 'workouts/:id/edit', component: CoachWorkoutEditComponent },
      { path: 'programs/:id/edit', component: CoachProgramEditComponent },
      { path: 'workouts/new', component: CoachNewWorkoutComponent },
      { path: 'exercises/:id/edit', component: CoachExerciseEditComponent },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: '**', redirectTo: 'dashboard' }
    ]
  },

  // User routes using common LayoutComponent
  {
    path: 'user',
    component: LayoutComponent,
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ROLE_USER'] },
    children: [
      { path: 'dashboard', component: UserDashboardComponent },
      { path: 'profile', component: UserProfileComponent },
      { path: 'my-programs', component: UserMyProgramsComponent },
      { path: 'statistics', component: UserStatisticsComponent },
      { path: 'programs/:id/workouts', component: WorkoutsComponent },
      { path: 'workouts/:workoutId/exercises', component: UserExercisesComponent },
      { path: 'workouts/:workoutId/exercises/:exerciseId', component: UserExerciseDetailComponent },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: '**', redirectTo: 'dashboard' }
    ]
  },

  // Root wildcard
  { path: '**', redirectTo: 'login' }
];
