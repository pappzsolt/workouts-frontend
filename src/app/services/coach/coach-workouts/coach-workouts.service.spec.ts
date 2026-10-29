import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { API_ENDPOINTS } from '../../../api-endpoints';
import { LanguageService } from '../../shared/language.service';
import { CoachWorkoutsService } from './coach-workouts.service';

describe('Coach workout HTTP contracts', () => {
  let service: CoachWorkoutsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(),
      { provide: LanguageService, useValue: { getCurrentLanguage: () => 'hu' } },
    ] });
    service = TestBed.inject(CoachWorkoutsService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('creates a workout with the exact existing request fields and language', () => {
    const form = {
      id: 5, name: 'New workout', description: 'Description', workoutDate: '2026-10-29',
      durationMinutes: 45, intensityLevel: 'HIGH', dayIndex: 2, done: false,
      completed: true, actualSets: 12, feedback: 'Occurrence only',
    };
    service.addWorkout(form).subscribe();
    const request = http.expectOne(req => req.url === API_ENDPOINTS.workoutAdd);
    expect(request.request.method).toBe('POST');
    expect(request.request.params.get('language')).toBe('hu');
    expect(request.request.body).toEqual({
      id: 5, name: 'New workout', description: 'Description', workoutDate: '2026-10-29',
      durationMinutes: 45, intensityLevel: 'HIGH', dayIndex: 2, done: false,
    });
    request.flush({ success: true, message: 'Created', data: { id: 5 } });
  });

  for (const duration of [undefined, 0, -1, 45]) {
    it(`keeps update request defaults and duration ${duration}`, () => {
      service.updateWorkout(7, { id: 99, name: '', description: '', workoutDate: '',
        durationMinutes: duration, intensityLevel: '', dayIndex: 0, done: false }, 'en').subscribe();
      const request = http.expectOne(req => req.url === API_ENDPOINTS.workoutUpdate(7));
      expect(request.request.method).toBe('PUT');
      expect(request.request.params.get('language')).toBe('en');
      expect(request.request.body).toEqual({
        id: 7, name: '', description: '', workoutDate: '', durationMinutes: duration === 45 ? 45 : null,
        intensityLevel: '', dayIndex: 0, done: false,
      });
      request.flush({ success: true, data: null });
    });
  }

  it('sends absent optional fields as null when creating a workout', () => {
    service.addWorkout({ name: 'Minimal', description: '' }).subscribe();
    const request = http.expectOne(req => req.url === API_ENDPOINTS.workoutAdd);
    expect(request.request.body).toEqual({
      id: null, name: 'Minimal', description: '', workoutDate: null,
      durationMinutes: null, intensityLevel: null, dayIndex: null, done: null,
    });
    request.flush({ success: true, data: null });
  });

  for (const [method, url] of [
    ['getMyWorkouts', API_ENDPOINTS.myWorkouts],
    ['getUniqueMyWorkouts', API_ENDPOINTS.uniqueMyWorkouts],
  ] as const) {
    it(`preserves catalogue fields and the response envelope for ${method}`, () => {
      service[method]().subscribe(response => {
        expect(response.success).toBeTrue();
        expect(response.message).toBe('Loaded');
        expect(response.data?.[0]).toEqual(jasmine.objectContaining({
          id: 7, name: 'Template', description: 'Description', workoutDate: '2026-10-29',
          durationMinutes: 30, intensityLevel: 'MEDIUM', done: false, exercises: [],
        }));
      });
      const request = http.expectOne(req => req.url === url);
      expect(request.request.params.get('language')).toBe('hu');
      request.flush({ success: true, message: 'Loaded', data: [{
        id: 7, name: 'Template', description: 'Description', workoutDate: '2026-10-29',
        durationMinutes: 30, intensityLevel: 'MEDIUM', done: false,
      }] });
    });
  }

  it('keeps the existing library paging, defaults and exercise filtering', () => {
    service.getWorkoutLibraryPage(2, 6, ' squat ', 'nameDesc').subscribe(page => {
      expect(page.totalElements).toBe(8);
      expect(page.totalPages).toBe(2);
      expect(page.items[0]).toEqual({
        id: 0, programNames: [], name: '', description: '', workoutDate: undefined,
        durationMinutes: undefined, intensityLevel: undefined, done: undefined,
        exercises: [jasmine.objectContaining({ id: 11, workoutId: 7, sets: 0, repetitions: 0, done: false })],
      });
    });
    const request = http.expectOne(req => req.url === API_ENDPOINTS.workoutLibraryPage);
    expect(request.request.params.get('page')).toBe('1');
    expect(request.request.params.get('size')).toBe('6');
    expect(request.request.params.get('search')).toBe('squat');
    expect(request.request.params.get('sort')).toBe('nameDesc');
    expect(request.request.params.get('language')).toBe('hu');
    request.flush({ success: true, data: { totalElements: 8, totalPages: 2, content: [{
      id: null, name: null, description: null, exercises: [
        { id: 11, workoutId: 7, exercise: { id: null, name: 'Squat' } },
        { id: null, workoutId: 7, exercise: { id: 2 } },
        { id: 12, workoutId: null, exercise: { id: 2 } },
        { id: 13, workoutId: 7, exercise: null },
      ],
    }] } });
  });

  it('keeps the raw detail DTO and language at the HTTP boundary', () => {
    const detail = { workoutId: 7, workoutName: 'Template', completed: true, actualSets: 10 };
    service.getWorkoutById(7, 'en').subscribe(response => {
      expect(response.message).toBe('Detail loaded');
      expect(response.data).toEqual(jasmine.objectContaining(detail));
    });
    const request = http.expectOne(req => req.url === API_ENDPOINTS.workoutById(7));
    expect(request.request.params.get('language')).toBe('en');
    request.flush({ success: true, message: 'Detail loaded', data: detail });
  });
});
