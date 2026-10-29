import type { Observable } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { API_ENDPOINTS } from '../../api-endpoints';
import type { ClientSetValues } from '../../models/coach-workspace.model';
import { LanguageService } from '../shared/language.service';
import { CoachWorkspaceService } from './coach-workspace.service';
import { CoachProgramsApiService } from './coach-programs-api.service';
import { CoachClientsApiService } from './coach-clients-api.service';
import { CoachWorkoutTemplatesApiService } from './coach-workouts-api.service';
import { CoachExerciseCatalogueApiService } from './coach-catalogue-api.service';

describe('Coach domain API contracts', () => {
  let http: HttpTestingController;
  let workspace: CoachWorkspaceService;
  let language: string;

  beforeEach(() => {
    language = 'hu';
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(),
      { provide: LanguageService, useValue: { getCurrentLanguage: () => language } },
    ] });
    http = TestBed.inject(HttpTestingController);
    workspace = TestBed.inject(CoachWorkspaceService);
  });
  afterEach(() => http.verify());

  it('creates a program with the current language at invocation and an empty workout list', () => {
    const details = { programName: 'Program', programDescription: '', durationDays: 7,
      difficultyLevel: 'BEGINNER', startDate: '2030-01-01' };
    language = 'de';
    const received = jasmine.createSpy('received');
    workspace.createProgram(details).subscribe(received);
    const request = http.expectOne(API_ENDPOINTS.createProgram);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ ...details, languageCode: 'de', workouts: [] });
    request.flush({ success: true, data: 15 });
    expect(received).toHaveBeenCalledOnceWith(15);
  });

  it('returns the backend assignment message through both the domain API and workspace facade', () => {
    for (const api of [workspace, TestBed.inject(CoachProgramsApiService)]) {
      const received = jasmine.createSpy('received');
      api.assignProgram(7, 10).subscribe(received);
      const request = http.expectOne(API_ENDPOINTS.assignProgram);
      expect(request.request.body).toEqual({ userId: 7, programId: 10 });
      request.flush({ success: true, data: null, message: 'Already assigned' });
      expect(received).toHaveBeenCalledOnceWith('Already assigned');
    }
  });

  it('keeps program-day update identifiers and unwraps a successful non-void response as void', () => {
    const received = jasmine.createSpy('received');
    workspace.moveWorkoutToDay(21, 3).subscribe(received);
    const request = http.expectOne(API_ENDPOINTS.programWorkoutUpdate(21));
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ id: 21, dayIndex: 3 });
    request.flush({ success: true, data: { affected: 1 } });
    expect(received).toHaveBeenCalledOnceWith(undefined);
  });

  it('preserves clear flags, zeroes, completion and the expected set snapshot', () => {
    const values: ClientSetValues = { targetRepetitions: 10, targetWeightKg: null,
      actualRepetitions: null, actualWeightKg: 0, restSeconds: null, notes: null,
      completed: false, targetRpe: null };
    const expected: ClientSetValues = { ...values, actualWeightKg: 20, completed: true };
    workspace.saveClientSet(12, values, expected).subscribe();
    const request = http.expectOne(API_ENDPOINTS.userWorkoutExerciseSetById(12));
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ expected, targetRepetitions: 10,
      targetRpe: null, clearTargetRpe: true, targetWeightKg: null, clearTargetWeightKg: true,
      actualRepetitions: null, clearActualRepetitions: true, actualWeightKg: 0, clearActualWeightKg: false,
      restSeconds: null, clearRestSeconds: true, notes: null, clearNotes: true, completed: false });
    request.flush({ success: true, data: null });
  });

  it('keeps optional effort and expected fields absent when they were not supplied', () => {
    TestBed.inject(CoachClientsApiService).saveClientSet(12, { targetRepetitions: 10,
      targetWeightKg: 20, actualRepetitions: 8, actualWeightKg: 20, restSeconds: 60, notes: '', completed: true }).subscribe();
    const request = http.expectOne(API_ENDPOINTS.userWorkoutExerciseSetById(12));
    expect(request.request.body.expected).toBeUndefined();
    expect(request.request.body.targetRpe).toBeUndefined();
    expect(request.request.body.clearTargetRpe).toBeUndefined();
    expect(request.request.body.notes).toBe('');
    expect(request.request.body.clearNotes).toBeFalse();
    request.flush({ success: true, data: null });
  });

  it('uses the current language and optional client filter for overview', () => {
    language = 'en';
    workspace.getOverview('2030-01-01', '2030-01-31', 7).subscribe();
    const request = http.expectOne(req => req.url === API_ENDPOINTS.coachOverview);
    expect(request.request.params.keys().sort()).toEqual(['from', 'language', 'to', 'userId']);
    expect(request.request.params.get('userId')).toBe('7');
    expect(request.request.params.get('language')).toBe('en');
    request.flush({ success: true, data: { clients: [] } });
  });

  it('preserves workout-copy parameters and the copied workout ID', () => {
    const received = jasmine.createSpy('received');
    workspace.copyWorkoutToDay(20, 10, 'Copy', '2030-01-03', 3).subscribe(received);
    const request = http.expectOne(req => req.url === API_ENDPOINTS.workoutCopy);
    expect(request.request.params.get('language')).toBe('hu');
    expect(request.request.body).toEqual({ sourceWorkoutId: 20, programId: 10,
      workoutName: 'Copy', workoutDate: '2030-01-03', dayIndex: 3 });
    request.flush({ success: true, data: 99 });
    expect(received).toHaveBeenCalledOnceWith(99);
  });

  it('creates a template from a minimal request and extracts the nested ID', () => {
    const received = jasmine.createSpy('received');
    TestBed.inject(CoachWorkoutTemplatesApiService).createWorkout('New', '2030-01-01').subscribe(received);
    const request = http.expectOne(req => req.url === API_ENDPOINTS.workoutAdd);
    expect(request.request.body).toEqual({ name: 'New', workoutDate: '2030-01-01' });
    request.flush({ success: true, data: { id: 22 } });
    expect(received).toHaveBeenCalledOnceWith(22);
  });

  it('keeps exercise search filters, numeric page parameters and nullable display defaults', () => {
    const received = jasmine.createSpy('received');
    workspace.browseExercises({ search: ' squat ', bodyPart: 'legs', equipment: 'barbell', page: 2, size: 10 }).subscribe(received);
    const request = http.expectOne(req => req.url === API_ENDPOINTS.exerciseSearch);
    expect(Object.fromEntries(request.request.params.keys().map(key => [key, request.request.params.get(key)])))
      .toEqual({ search: 'squat', bodyPart: 'legs', equipment: 'barbell', page: '2', size: '10', language: 'hu', sortDirection: 'asc' });
    request.flush({ success: true, data: { content: [{ id: 1, name: 'Squat', description: '', muscleGroup: '', equipment: '' }], totalElements: 1, totalPages: 0 } });
    expect(received).toHaveBeenCalledOnceWith({ items: [{ id: 1, name: 'Squat', description: null,
      bodyPart: null, primaryMuscles: null, muscleGroup: null, equipment: null, imageUrl: null }], totalElements: 1, totalPages: 1 });
  });

  it('keeps the empty filter-options fallback in the catalogue domain API', () => {
    const received = jasmine.createSpy('received');
    TestBed.inject(CoachExerciseCatalogueApiService).getExerciseFilterOptions().subscribe(received);
    http.expectOne(API_ENDPOINTS.exerciseFilterOptions).flush({ success: true, data: null });
    expect(received).toHaveBeenCalledOnceWith({ bodyParts: [], equipment: [] });
  });

  for (const domain of ['clients', 'programs', 'workouts', 'catalogue'] as const) {
    it(`propagates the backend business error for ${domain}`, () => {
      const failed = jasmine.createSpy('failed');
      const request: Observable<unknown> = domain === 'clients' ? workspace.getOverview('2030-01-01', '2030-01-31')
        : domain === 'programs' ? workspace.getCoachPrograms()
        : domain === 'workouts' ? workspace.getMyWorkouts() : workspace.getExerciseFilterOptions();
      request.subscribe({ error: failed });
      http.expectOne(() => true).flush({ success: false, message: 'Denied by server', data: null });
      expect(failed).toHaveBeenCalledOnceWith(jasmine.objectContaining({ message: 'Denied by server' }));
    });
  }
});
