import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { API_ENDPOINTS } from '../api-endpoints';
import { AuthService } from './auth/auth.service';
import { LanguageService } from './shared/language.service';
import { CoachProfileService } from './coach/coach-profile.service';
import { UserMyProgramsService } from './user/user-my-program/user-my-programs.service';
import { UserWorkoutsService } from './user/user-workouts/user-workouts.service';
import { UserExerciseDetailService } from './user/user-exercises-detail/user-exercises-detail.service';

describe('Backend message preservation through DTO mapping', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(),
      { provide: LanguageService, useValue: { getCurrentLanguage: () => 'hu' } },
      { provide: AuthService, useValue: { getUserId: () => 1 } },
    ] });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('preserves coach profile messages while mapping member fields', () => {
    TestBed.inject(CoachProfileService).getMemberById(1).subscribe(response => {
      expect(response.success).toBeTrue(); expect(response.message).toBe('Profile loaded');
      expect(response.data?.usernameOrName).toBe('Coach');
    });
    http.expectOne(API_ENDPOINTS.memberCoachById(1)).flush({ success: true, message: 'Profile loaded',
      data: { id: 1, type: 'coach', usernameOrName: 'Coach', email: 'coach@example.com', extraFields: { phone: '123' } } });
  });

  it('retains a profile failure instead of converting it into a data-validation error', () => {
    TestBed.inject(CoachProfileService).getMemberById(1).subscribe(response => {
      expect(response.success).toBeFalse(); expect(response.message).toBe('Profile denied'); expect(response.data).toBeNull();
    });
    http.expectOne(API_ENDPOINTS.memberCoachById(1)).flush({ success: false, message: 'Profile denied', data: null });
  });

  it('preserves assigned-program messages and mapped durations', () => {
    TestBed.inject(UserMyProgramsService).getPrograms().subscribe(response => {
      expect(response.message).toBe('Programs loaded'); expect(response.data?.[0].durationWeeks).toBe(2);
    });
    http.expectOne(req => req.url === API_ENDPOINTS.assignedPrograms).flush({ success: true, message: 'Programs loaded',
      data: [{ id: 7, name: 'Program', durationDays: 14 }] });
  });

  it('retains a program-list failure without presenting a successful empty list', () => {
    TestBed.inject(UserMyProgramsService).getPrograms().subscribe(response => {
      expect(response.success).toBeFalse(); expect(response.message).toBe('Programs denied'); expect(response.data).toBeNull();
    });
    http.expectOne(req => req.url === API_ENDPOINTS.assignedPrograms).flush({ success: false, message: 'Programs denied', data: null });
  });

  it('preserves progress response messages', () => {
    TestBed.inject(UserMyProgramsService).getProgramProgress([7]).subscribe(response => {
      expect(response.message).toBe('Progress loaded'); expect(response.data?.[0].progressPercent).toBe(50);
    });
    http.expectOne(req => req.url === API_ENDPOINTS.assignedProgramsProgress).flush({ success: true, message: 'Progress loaded',
      data: [{ programId: 7, progressPercent: 50 }] });
  });

  it('preserves workout messages and concrete occurrence IDs', () => {
    TestBed.inject(UserWorkoutsService).getWorkoutsByProgram(7).subscribe(response => {
      expect(response.message).toBe('Workouts loaded'); expect(response.data?.[0].userWorkoutId).toBe(42);
    });
    http.expectOne(req => req.url === API_ENDPOINTS.workoutsByProgram(7)).flush({ success: true, message: 'Workouts loaded',
      data: [{ workoutId: 9, programWorkoutId: 30, userWorkoutId: 42 }] });
  });

  it('retains the workout failure envelope', () => {
    TestBed.inject(UserWorkoutsService).getWorkoutsByProgram(7).subscribe(response => {
      expect(response.success).toBeFalse(); expect(response.message).toBe('Workouts denied'); expect(response.data).toBeNull();
    });
    http.expectOne(req => req.url === API_ENDPOINTS.workoutsByProgram(7)).flush({ success: false, message: 'Workouts denied', data: null });
  });

  it('returns the actual set-save response instead of void', () => {
    TestBed.inject(UserExerciseDetailService).updateSetCompleted(42, 7, 9, 2, 3, true, 10, 20, null).subscribe(response => {
      expect(response.success).toBeTrue(); expect(response.message).toBe('Set saved');
    });
    const request = http.expectOne(API_ENDPOINTS.exerciseSetCompleted);
    expect(request.request.method).toBe('PATCH');
    request.flush({ success: true, message: 'Set saved', data: null });
  });
});
