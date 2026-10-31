import type { PersonalProgramEditorComponent } from './components/user-dashboard/operations/personal-programs/personal-program-editor.component';
import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';

import { LoginComponent } from './components/login/login.component';
import { LoginLayoutComponent } from './layouts/login-layout/login-layout.component';
import { LayoutComponent } from './layouts/default-layout/layout.component';



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
        loadComponent: () => import('./components/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent),
      },
      {
        path: 'reset-password',
        loadComponent: () => import('./components/reset-password/reset-password.component').then(m => m.ResetPasswordComponent),
      },
      {
        path: 'register',
        loadComponent: () => import('./components/register/register.component').then(m => m.RegisterComponent),
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
        loadComponent: () => import('./components/admin-dashboard/dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent),
      },

      {
        path: 'users',
        loadComponent: () => import('./components/admin-dashboard/operations/admin-list-users/admin-list-users.component').then(m => m.AdminListUsersComponent),
      },

      {
        path: 'users/search',
        loadComponent: () => import('./components/admin-dashboard/operations/user-search/member-search.component').then(m => m.MemberSearchComponent),
      },

      {
        path: 'choice-users/edit',
        loadComponent: () => import('./components/admin-dashboard/operations/choice-user-edit/choice-user-edit.component').then(m => m.ChoiceUserEditComponent),
      },

      {
        path: 'choice-users/new',
        loadComponent: () => import('./components/admin-dashboard/operations/choice-user-new/choice-user-new.component').then(m => m.ChoiceUserNewComponent),
      },

      {
        path: 'users/new',
        loadComponent: () => import('./components/admin-dashboard/operations/user-new/user-new.component').then(m => m.UserNewComponent),
      },

      {
        path: 'coach/new',
        loadComponent: () => import('./components/admin-dashboard/operations/coach-new/coach-new.component').then(m => m.CoachNewComponent),
      },

      {
        path: 'coach/edit',
        loadComponent: () => import('./components/admin-dashboard/operations/coach-edit/coach-edit.component').then(m => m.CoachEditComponent),
      },

      {
        path: 'users/edit',
        loadComponent: () => import('./components/admin-dashboard/operations/user-edit/user-edit.component').then(m => m.UserEditComponent),
      },

      {
        path: 'login-audit-logs',
        loadComponent: () => import('./components/admin-dashboard/operations/login-audit-logs/login-audit-logs.component').then(m => m.LoginAuditLogsComponent),
      },

      {
        path: 'registrations',
        loadComponent: () => import('./components/admin-dashboard/operations/registration-requests/registration-requests.component').then(m => m.RegistrationRequestsComponent),
      },

      {
        path: 'bug-reports',
        loadComponent: () => import('./components/admin-dashboard/operations/bug-reports/bug-reports.component').then(m => m.BugReportsComponent),
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
        loadComponent: () => import('./components/coach/coach-home/coach-home.component').then(m => m.CoachHomeComponent),
      },

      {
        path: 'clients',
        loadComponent: () => import('./components/coach/coach-clients/coach-clients.component').then(m => m.CoachClientsComponent),
      },

      {
        path: 'clients/:userId',
        loadComponent: () => import('./components/coach/coach-client-detail/coach-client-detail.component').then(m => m.CoachClientDetailComponent),
      },

      {
        path: 'programs',
        loadComponent: () => import('./components/coach/coach-programs/coach-programs.component').then(m => m.CoachProgramsComponent),
      },

      {
        path: 'programs/new',
        loadComponent: () => import('./components/coach/coach-program-editor/coach-program-editor.component').then(m => m.CoachProgramEditorComponent),
      },

      {
        path: 'programs/import',
        data: { importScope: 'coach' },
        canDeactivate: [(component: { canLeave(): boolean }) => component.canLeave()],
        loadComponent: () => import('./components/shared/components/program-import/program-import.component').then(m => m.ProgramImportComponent),
      },

      {
        path: 'programs/:id',
        loadComponent: () => import('./components/coach/coach-program-editor/coach-program-editor.component').then(m => m.CoachProgramEditorComponent),
      },

      {
        path: 'workouts',
        loadComponent: () => import('./components/coach-dashboard/operations/coach-workouts/coach-workouts.component').then(m => m.WorkoutListComponent),
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
        loadComponent: () => import('./components/coach-dashboard/operations/coach-workouts/coach-workout-edit/coach-workout-edit.component').then(m => m.CoachWorkoutEditComponent),
      },

      {
        path: 'exercises',
        loadComponent: () => import('./components/coach-dashboard/operations/coach-exercises/coach-exercises.component').then(m => m.ExerciseControllerComponent),
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
        loadComponent: () => import('./components/coach-dashboard/operations/coach-exercises/coach-exercise-edit/coach-exercise-edit.component').then(m => m.CoachExerciseEditComponent),
      },

      {
        path: 'profile',
        loadComponent: () => import('./components/coach-dashboard/operations/coach-profile/coach-profile.component').then(m => m.CoachProfileComponent),
      },

      {
        path: 'bug-report',
        loadComponent: () => import('./components/shared/bug-report/bug-report.component').then(m => m.BugReportComponent),
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
        loadComponent: () => import('./components/user-dashboard/dashboard/user-dashboard.component').then(m => m.UserDashboardComponent),
      },

      {
        path: 'profile',
        loadComponent: () => import('./components/user-dashboard/operations/user-profile/user-profile.component').then(m => m.UserProfileComponent),
      },

      {
        path: 'bug-report',
        loadComponent: () => import('./components/shared/bug-report/bug-report.component').then(m => m.BugReportComponent),
      },

      {
        path: 'workout-templates',
        loadComponent: () => import('./components/user-dashboard/operations/personal-programs/workout-templates.component').then(m => m.WorkoutTemplatesComponent),
      },
      {
        path: 'personal-workouts/new',
        data: { standalone: true },
        loadComponent: () => import('./components/user-dashboard/operations/personal-programs/personal-program-editor.component').then(m => m.PersonalProgramEditorComponent),
        canDeactivate: [(component: PersonalProgramEditorComponent) => component.canLeave()],
      },
      {
        path: 'personal-workouts/:id',
        data: { standalone: true },
        loadComponent: () => import('./components/user-dashboard/operations/personal-programs/personal-program-editor.component').then(m => m.PersonalProgramEditorComponent),
        canDeactivate: [(component: PersonalProgramEditorComponent) => component.canLeave()],
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
        path: 'personal-programs/import',
        data: { importScope: 'personal' },
        canDeactivate: [(component: { canLeave(): boolean }) => component.canLeave()],
        loadComponent: () => import('./components/shared/components/program-import/program-import.component').then(m => m.ProgramImportComponent),
      },
      {
        path: 'personal-programs/:id',
        loadComponent: () => import('./components/user-dashboard/operations/personal-programs/personal-program-editor.component').then(m => m.PersonalProgramEditorComponent),
        canDeactivate: [(component: PersonalProgramEditorComponent) => component.canLeave()],
      },
      {
        path: 'my-programs',
        loadComponent: () => import('./components/user-dashboard/operations/user-my-programs/user-my-programs.component').then(m => m.UserMyProgramsComponent),
      },

      {
        path: 'program-statistics',
        loadComponent: () => import('./components/user-dashboard/operations/program-statistics/program-statistics.component').then(m => m.UserProgramStatisticsComponent),
      },
      {
        path: 'workouts',
        loadComponent: () => import('./components/user-dashboard/operations/user-workouts-calendar/user-workouts-calendar.component').then(m => m.UserWorkoutsCalendarComponent),
      },

      {
        path: 'programs/:id/workouts',
        loadComponent: () => import('./components/user-dashboard/operations/user-workouts/workouts.component').then(m => m.WorkoutsComponent),
      },

      {
        path: 'workouts/:workoutId/exercises',
        loadComponent: () => import('./components/user-dashboard/operations/user-exercises/user-exercises.component').then(m => m.UserExercisesComponent),
      },

      {
        path: 'workouts/:workoutId/exercises/:exerciseId',
        loadComponent: () => import('./components/user-dashboard/operations/user-exercises/user-exercises-detail/user-exercises-detail.component').then(m => m.UserExerciseDetailComponent),
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
