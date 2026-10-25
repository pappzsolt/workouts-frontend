import type { PersonalProgramEditorComponent } from './components/user-dashboard/operations/personal-programs/personal-program-editor.component';
import { Routes } from '@angular/router';

import { LoginComponent } from './components/login/login.component';
import { ForgotPasswordComponent } from './components/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './components/reset-password/reset-password.component';
import { RegisterComponent } from './components/register/register.component';
import { LoginLayoutComponent } from './layouts/login-layout/login-layout.component';
import { LayoutComponent } from './layouts/default-layout/layout.component';
import { UserProgramStatisticsComponent } from './components/user-dashboard/operations/program-statistics/program-statistics.component';
import { AdminDashboardComponent } from './components/admin-dashboard/dashboard/admin-dashboard.component';
import { AdminListUsersComponent } from './components/admin-dashboard/operations/admin-list-users/admin-list-users.component';
import { MemberSearchComponent } from './components/admin-dashboard/operations/user-search/member-search.component';
import { ChoiceUserNewComponent } from './components/admin-dashboard/operations/choice-user-new/choice-user-new.component';
import { ChoiceUserEditComponent } from './components/admin-dashboard/operations/choice-user-edit/choice-user-edit.component';
import { CoachNewComponent } from './components/admin-dashboard/operations/coach-new/coach-new.component';
import { UserNewComponent } from './components/admin-dashboard/operations/user-new/user-new.component';
import { CoachEditComponent } from './components/admin-dashboard/operations/coach-edit/coach-edit.component';
import { UserEditComponent } from './components/admin-dashboard/operations/user-edit/user-edit.component';
import { LoginAuditLogsComponent } from './components/admin-dashboard/operations/login-audit-logs/login-audit-logs.component';
import { RegistrationRequestsComponent } from './components/admin-dashboard/operations/registration-requests/registration-requests.component';
import { BugReportsComponent } from './components/admin-dashboard/operations/bug-reports/bug-reports.component';
import { BugReportComponent } from './components/shared/bug-report/bug-report.component';
import { CoachHomeComponent } from './components/coach/coach-home/coach-home.component';
import { CoachClientsComponent } from './components/coach/coach-clients/coach-clients.component';
import { CoachClientDetailComponent } from './components/coach/coach-client-detail/coach-client-detail.component';
import { CoachProgramsComponent } from './components/coach/coach-programs/coach-programs.component';
import { CoachProgramEditorComponent } from './components/coach/coach-program-editor/coach-program-editor.component';
import { CoachProfileComponent } from './components/coach-dashboard/operations/coach-profile/coach-profile.component';
import { ExerciseControllerComponent } from './components/coach-dashboard/operations/coach-exercises/coach-exercises.component';
import { WorkoutListComponent } from './components/coach-dashboard/operations/coach-workouts/coach-workouts.component';
import { CoachWorkoutEditComponent } from './components/coach-dashboard/operations/coach-workouts/coach-workout-edit/coach-workout-edit.component';
import { CoachExerciseEditComponent } from './components/coach-dashboard/operations/coach-exercises/coach-exercise-edit/coach-exercise-edit.component';

import { UserDashboardComponent } from './components/user-dashboard/dashboard/user-dashboard.component';
import { UserProfileComponent } from './components/user-dashboard/operations/user-profile/user-profile.component';
import { UserMyProgramsComponent } from './components/user-dashboard/operations/user-my-programs/user-my-programs.component';
import { WorkoutsComponent } from './components/user-dashboard/operations/user-workouts/workouts.component';
import { UserExercisesComponent } from './components/user-dashboard/operations/user-exercises/user-exercises.component';
import { UserExerciseDetailComponent } from './components/user-dashboard/operations/user-exercises/user-exercises-detail/user-exercises-detail.component';
import { UserWorkoutsCalendarComponent } from './components/user-dashboard/operations/user-workouts-calendar/user-workouts-calendar.component';

import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';

export const routes: Routes = [
  // ============================================================
  // LOGIN
  // ============================================================
  {
    path: '',
    component: LoginLayoutComponent,
    children: [
      {
        path: 'login',
        component: LoginComponent,
      },
      {
        path: 'forgot-password',
        component: ForgotPasswordComponent,
      },
      {
        path: 'reset-password',
        component: ResetPasswordComponent,
      },
      {
        path: 'register',
        component: RegisterComponent,
      },
      {
        path: '',
        redirectTo: 'login',
        pathMatch: 'full',
      },
    ],
  },

  // ============================================================
  // ADMIN
  // ============================================================
  {
    path: 'admin',
    component: LayoutComponent,
    canActivate: [authGuard, roleGuard],
    data: {
      roles: ['ROLE_ADMIN'],
    },
    children: [
      {
        path: 'dashboard',
        component: AdminDashboardComponent,
      },

      {
        path: 'users',
        component: AdminListUsersComponent,
      },

      {
        path: 'users/search',
        component: MemberSearchComponent,
      },

      {
        path: 'choice-users/edit',
        component: ChoiceUserEditComponent,
      },

      {
        path: 'choice-users/new',
        component: ChoiceUserNewComponent,
      },

      {
        path: 'users/new',
        component: UserNewComponent,
      },

      {
        path: 'coach/new',
        component: CoachNewComponent,
      },

      {
        path: 'coach/edit',
        component: CoachEditComponent,
      },

      {
        path: 'users/edit',
        component: UserEditComponent,
      },

      {
        path: 'login-audit-logs',
        component: LoginAuditLogsComponent,
      },

      {
        path: 'registrations',
        component: RegistrationRequestsComponent,
      },

      {
        path: 'bug-reports',
        component: BugReportsComponent,
      },

      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },

      {
        path: '**',
        redirectTo: 'dashboard',
      },
    ],
  },

  // ============================================================
  // COACH
  // ============================================================
  {
    path: 'coach',
    component: LayoutComponent,
    canActivate: [authGuard, roleGuard],
    data: {
      roles: ['ROLE_COACH'],
    },
    children: [
      {
        path: 'dashboard',
        component: CoachHomeComponent,
      },

      {
        path: 'clients',
        component: CoachClientsComponent,
      },

      {
        path: 'clients/:userId',
        component: CoachClientDetailComponent,
      },

      {
        path: 'programs',
        component: CoachProgramsComponent,
      },

      {
        path: 'programs/new',
        component: CoachProgramEditorComponent,
      },

      {
        path: 'programs/:id',
        component: CoachProgramEditorComponent,
      },

      {
        path: 'workouts',
        component: WorkoutListComponent,
      },

      {
        path: 'workouts/new',
        loadComponent: () =>
          import('./components/coach-dashboard/operations/coach-workouts/coach-workout-new/new-workout.component').then(
            (m) => m.NewWorkoutComponent,
          ),
      },

      {
        path: 'workouts/:id/edit',
        component: CoachWorkoutEditComponent,
      },

      {
        path: 'exercises',
        component: ExerciseControllerComponent,
      },

      {
        path: 'exercises/new',
        loadComponent: () =>
          import('./components/coach-dashboard/operations/coach-exercises/coach-exercise-new/new-exercise.component').then(
            (m) => m.NewExerciseComponent,
          ),
      },

      {
        path: 'exercises/:id/edit',
        component: CoachExerciseEditComponent,
      },

      {
        path: 'profile',
        component: CoachProfileComponent,
      },

      {
        path: 'bug-report',
        component: BugReportComponent,
      },

      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },

      {
        path: '**',
        redirectTo: 'dashboard',
      },
    ],
  },

  // ============================================================
  // USER
  // ============================================================
  {
    path: 'user',
    component: LayoutComponent,
    canActivate: [authGuard, roleGuard],
    data: {
      roles: ['ROLE_USER'],
    },
    children: [
      {
        path: 'dashboard',
        component: UserDashboardComponent,
      },

      {
        path: 'profile',
        component: UserProfileComponent,
      },

      {
        path: 'bug-report',
        component: BugReportComponent,
      },

      {
        path: 'personal-programs',
        loadComponent: () => import('./components/user-dashboard/operations/personal-programs/personal-programs.component').then(m => m.PersonalProgramsComponent),
      },
      {
        path: 'personal-programs/new',
        loadComponent: () => import('./components/user-dashboard/operations/personal-programs/personal-program-editor.component').then(m => m.PersonalProgramEditorComponent),
        canDeactivate: [(component: PersonalProgramEditorComponent) => component.canLeave()],
      },
      {
        path: 'personal-programs/:id',
        loadComponent: () => import('./components/user-dashboard/operations/personal-programs/personal-program-editor.component').then(m => m.PersonalProgramEditorComponent),
        canDeactivate: [(component: PersonalProgramEditorComponent) => component.canLeave()],
      },
      {
        path: 'my-programs',
        component: UserMyProgramsComponent,
      },

      {
        path: 'program-statistics',
        component: UserProgramStatisticsComponent,
      },
      {
        path: 'workouts',
        component: UserWorkoutsCalendarComponent,
      },

      {
        path: 'programs/:id/workouts',
        component: WorkoutsComponent,
      },

      {
        path: 'workouts/:workoutId/exercises',
        component: UserExercisesComponent,
      },

      {
        path: 'workouts/:workoutId/exercises/:exerciseId',
        component: UserExerciseDetailComponent,
      },

      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },

      {
        path: '**',
        redirectTo: 'dashboard',
      },
    ],
  },

  // ============================================================
  // ROOT
  // ============================================================
  {
    path: '**',
    redirectTo: 'login',
  },
];
