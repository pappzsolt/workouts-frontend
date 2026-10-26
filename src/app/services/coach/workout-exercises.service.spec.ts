import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_ENDPOINTS } from '../../api-endpoints';
import { LanguageService } from '../shared/language.service';
import { CoachWorkspaceService } from './coach-workspace.service';
import { WorkoutExerciseService } from './workout-exercises.service';

describe('Workout exercise ordering', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(), provideHttpClientTesting(),
      { provide: LanguageService, useValue: { getCurrentLanguage: () => 'hu' } },
    ] });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('preserves the edit screen response and ordering parameters', () => {
    const response = { success: true, data: null, message: 'Saved' };
    const received = jasmine.createSpy('received');
    TestBed.inject(WorkoutExerciseService).updateOrderIndex(12, 34, 2).subscribe(received);
    const request = http.expectOne(request => request.url === API_ENDPOINTS.workoutExerciseOrderIndex);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toBeNull();
    expect(request.request.params.get('workoutId')).toBe('12');
    expect(request.request.params.get('exerciseId')).toBe('34');
    expect(request.request.params.get('orderIndex')).toBe('2');
    request.flush(response);
    expect(received).toHaveBeenCalledWith(response);
  });

  it('uses the same service for the workspace and propagates rejected changes', () => {
    const service = TestBed.inject(WorkoutExerciseService);
    const save = spyOn(service, 'updateOrderIndex').and.callThrough();
    const failed = jasmine.createSpy('failed');
    TestBed.inject(CoachWorkspaceService).moveTemplateExercise(12, 34, 2).subscribe({ error: failed });
    expect(save).toHaveBeenCalledOnceWith(12, 34, 2);
    http.expectOne(request => request.url === API_ENDPOINTS.workoutExerciseOrderIndex)
      .flush({ success: false, data: null, message: 'Order rejected' });
    expect(failed).toHaveBeenCalledWith(jasmine.objectContaining({ message: 'Order rejected' }));
  });
});
