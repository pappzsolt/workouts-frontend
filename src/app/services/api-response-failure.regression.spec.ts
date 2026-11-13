import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import type { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../api-endpoints';
import { AdminListUsersService } from './admin/admin-list-users.service';
import { CoachEditService } from './admin/coach-edit.service';
import { UserEditService } from './admin/user-edit.service';
import { RoleService } from './roles/role.service';
import { UserProfilService } from './user/user-profile/user-profile.service';
import { WorkoutExercisesManagerService } from './user/workout-exercises-manager.service';
import { ExerciseService } from './coach/coach-exercises/coach-exercises.service';
import { LanguageService } from './shared/language.service';
import { LoggerService } from './logger.service';

describe('API failure responses must not be shown as successful data', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LanguageService, useValue: { getCurrentLanguage: () => 'hu' } },
        { provide: LoggerService, useValue: { error: () => {} } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function rejected(request: Observable<unknown>, url: string, data: unknown): void {
    let error: unknown;
    let returned = false;
    request.subscribe({
      next: () => { returned = true; },
      error: value => { error = value; },
    });
    http.expectOne(req => req.url === url).flush({ success: false, message: 'Backend rejected', data });
    expect(returned).toBeFalse();
    expect(error).toEqual(jasmine.any(Error));
  }

  it('rejects unsuccessful member list replies instead of showing zero users', () => {
    rejected(TestBed.inject(AdminListUsersService).getUsers(), API_ENDPOINTS.members, []);
  });

  it('rejects unsuccessful admin editor users, coaches and roles', () => {
    const service = TestBed.inject(UserEditService);
    rejected(service.getUsers(), API_ENDPOINTS.allUsers, []);
    rejected(service.getCoaches(), API_ENDPOINTS.allCoaches, [{ id: 7, name: 'Coach' }]);
    rejected(service.getRoles(), API_ENDPOINTS.roles, [{ id: 3, name: 'ROLE_USER' }]);
  });

  it('rejects unsuccessful coach list and coach detail responses despite populated data', () => {
    const service = TestBed.inject(CoachEditService);
    const coach = { id: 7, type: 'coach', usernameOrName: 'Coach', email: 'coach@example.com' };
    rejected(service.getCoaches(), API_ENDPOINTS.members, [coach]);
    rejected(service.getCoach(7), API_ENDPOINTS.memberCoachById(7), coach);
  });

  it('rejects unsuccessful role and profile lookup responses', () => {
    rejected(TestBed.inject(RoleService).getRoles(), API_ENDPOINTS.roles, [{ id: 1, name: 'ROLE_ADMIN' }]);
    const profile = TestBed.inject(UserProfilService);
    rejected(profile.getCoaches(), API_ENDPOINTS.allCoaches, [{ id: 7, name: 'Coach' }]);
    rejected(profile.getMemberById(8), API_ENDPOINTS.memberUserById(8), {
      id: 8, type: 'user', usernameOrName: 'User', email: 'user@example.com', extraFields: {},
    });
  });

  it('does not turn unsuccessful workout exercise responses into empty or valid workouts', () => {
    rejected(TestBed.inject(WorkoutExercisesManagerService).getExercisesForUserWorkout(17),
      API_ENDPOINTS.userWorkoutExerciseByWorkout(17), []);
    rejected(TestBed.inject(ExerciseService).getWorkoutExercises(12),
      API_ENDPOINTS.exerciseForWorkout(12), { id: 12, name: 'Workout', exercises: [] });
  });

  it('keeps successful member-list mappings unchanged', () => {
    let users: { username: string }[] = [];
    TestBed.inject(AdminListUsersService).getUsers().subscribe(value => { users = value; });
    http.expectOne(API_ENDPOINTS.members).flush({
      success: true, message: null,
      data: [{ id: 3, type: 'user', usernameOrName: 'Athlete', email: 'athlete@example.com', roles: ['ROLE_USER'] }],
    });
    expect(users.map(user => user.username)).toEqual(['Athlete']);
  });
});
