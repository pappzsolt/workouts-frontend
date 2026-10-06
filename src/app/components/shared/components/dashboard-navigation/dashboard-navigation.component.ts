import { Component, DestroyRef, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { SHARED_IMPORTS } from '../../shared-imports';

interface NavigationItem {
  label: string;
  url: string;
}

const dashboard = '/coach/dashboard';
const sections: Record<string, string> = {
  programs: 'coachDashboard.programs',
  workouts: 'coachDashboard.workouts',
  exercises: 'coachDashboard.exercises',
  assignments: 'assignProgram.title',
  'program-workouts': 'coachNavigation.programWorkouts',
  'workout-exercises': 'coachDashboard.assignWorkoutExercises',
  'workout-exercise-manager': 'coachDashboard.workoutExerciseManager',
};

@Component({
  selector: 'app-dashboard-navigation',
  standalone: true,
  imports: [...SHARED_IMPORTS],
  templateUrl: './dashboard-navigation.component.html',
})
export class DashboardNavigationComponent {
  private readonly router = inject(Router);
  items: NavigationItem[] = [];

  constructor() {
    this.update();
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      takeUntilDestroyed(inject(DestroyRef)),
    ).subscribe(() => this.update());
  }

  link(url: string) {
    return this.router.parseUrl(url);
  }

  private update(): void {
    const tree = this.router.parseUrl(this.router.url);
    const segments = tree.root.children['primary']?.segments.map(segment => segment.path) ?? [];
    this.items = [];
    if (segments[0] === 'user') {
      this.updateUser(segments, tree.queryParams);
      return;
    }
    if (segments[0] === 'admin') {
      this.updateAdmin(segments);
      return;
    }
    if (segments[0] !== 'coach') return;

    this.items = [{ label: 'coachDashboard.title', url: dashboard }];
    const page = segments[1];
    const section = tree.queryParams['section'];
    const addSection = (name: string): void => {
      this.items.push({ label: sections[name], url: `${dashboard}?section=${name}` });
    };
    if (page === 'dashboard') {
      if (sections[section]) {
        if (section === 'program-workouts') addSection('programs');
        addSection(section);
      }
      return;
    }

    let label: string | undefined;
    if (page === 'programs' || page === 'workouts' || page === 'exercises') {
      addSection(page);
      if (segments.length === 2) {
        this.items[this.items.length - 1].url = this.router.url;
        return;
      }
      if (segments[2] === 'new') {
        label = { programs: 'coachNewProgram.title', workouts: 'newWorkout.title', exercises: 'newExercise.title' }[page];
      } else if (segments[3] === 'edit') {
        label = { programs: 'coachProgramEdit.title', workouts: 'coachWorkoutEdit.title', exercises: 'coachExerciseEdit.title' }[page];
      } else if (segments[3] === 'workouts') {
        label = 'assignWorkoutExercises.title';
      }
    } else if (page === 'profile') {
      label = 'coachProfile.title';
    } else if (page === 'program-builder') {
      addSection('programs');
      label = 'coachProgramBuilder.title';
    } else if (page === 'assign-workouts-exercises') {
      label = 'assignWorkoutExercises.title';
    }
    if (label) this.items.push({ label, url: this.router.url });
  }

  private updateAdmin(segments: string[]): void {
    this.items = [{ label: 'adminDashboard.title', url: '/admin/dashboard' }];
    const page = segments.slice(1).join('/');
    if (page === 'dashboard') return;
    const pages: Record<string, string> = {
      users: 'adminUsers.title',
      'users/search': 'adminMemberSearch.title',
      'choice-users/new': 'adminChoiceNew.title',
      'choice-users/edit': 'adminChoiceEdit.title',
      'users/new': 'adminUserNew.title',
      'users/edit': 'adminUserEdit.title',
      'coach/new': 'adminCoachNew.title',
      'coach/edit': 'adminCoachEdit.title',
    };
    if (page === 'users/search') {
      this.items.push({ label: 'adminUsers.title', url: '/admin/users' });
    } else if (segments[1] !== 'choice-users' && ['new', 'edit'].includes(segments[2])) {
      const action = segments[2];
      this.items.push({
        label: action === 'new' ? 'adminChoiceNew.title' : 'adminChoiceEdit.title',
        url: `/admin/choice-users/${action}`,
      });
    }
    if (pages[page]) this.items.push({ label: pages[page], url: this.router.url });
  }

  private updateUser(segments: string[], queryParams: Record<string, unknown>): void {
    this.items = [{ label: 'userDashboard.title', url: '/user/dashboard' }];
    const page = segments[1];
    if (page === 'dashboard') return;
    const pages: Record<string, string> = {
      profile: 'userProfile.title',
      'my-programs': 'userMyPrograms.title',
      'program-statistics': 'userProgramStatistics.title',
      workouts: 'userDashboard.myWorkouts',
    };
    if (page === 'programs' && segments[3] === 'workouts') {
      this.items.push({ label: 'userMyPrograms.title', url: '/user/my-programs' });
      this.items.push({ label: 'userDashboard.myWorkouts', url: this.router.url });
    } else if (page === 'workouts' && segments[3] === 'exercises') {
      const programId = queryParams['programId'];
      if (programId) {
        this.items.push({ label: 'userMyPrograms.title', url: '/user/my-programs' });
        this.items.push({
          label: 'userDashboard.myWorkouts',
          url: this.router.createUrlTree(['/user/programs', programId, 'workouts'], {
            queryParams: { programName: queryParams['programName'] },
          }).toString(),
        });
      } else {
        this.items.push({ label: 'userDashboard.myWorkouts', url: '/user/workouts' });
      }
      this.items.push({
        label: 'userExercises.exercises',
        url: this.router.createUrlTree(['/user/workouts', segments[2], 'exercises'], { queryParams }).toString(),
      });
      if (segments[4]) {
        this.items.push({ label: 'userExerciseDetail.exercise', url: this.router.url });
      }
    } else if (pages[page]) {
      this.items.push({ label: pages[page], url: this.router.url });
    }
  }

}
