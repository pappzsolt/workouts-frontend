import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { API_ENDPOINTS } from '../api-endpoints';
import { UserExerciseDetailService } from './user/user-exercises-detail/user-exercises-detail.service';
import { CoachWorkspaceService } from './coach/coach-workspace.service';
import { LanguageService } from './shared/language.service';
import { LoggerService } from './logger.service';
import { CoachClientDetailComponent } from '../components/coach/coach-client-detail/coach-client-detail.component';
import type { EditableSet } from '../components/coach/coach-client-detail/client-plan';
import { UserExerciseDetailComponent } from '../components/user-dashboard/operations/user-exercises/user-exercises-detail/user-exercises-detail.component';
import type { UserWorkoutExerciseSetDto, UserWorkoutExerciseDetailDto } from '../models/user-workout-exercise-detail.dto';
import type { ApiResponse } from '../models/backend-dto/common/api-response';

const oldValues = { targetRepetitions: 10, targetWeightKg: 80, actualRepetitions: 10, actualWeightKg: 80,
  restSeconds: 90, notes: null, completed: true };

describe('Optional set effort fields', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(),
      { provide: LanguageService, useValue: { getCurrentLanguage: () => 'hu' } },
      { provide: ActivatedRoute, useValue: {} }, { provide: Router, useValue: {} },
      { provide: LoggerService, useValue: { error() {} } },
    ] });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('sends athlete RPE and zero RIR without changing the coach prescription', () => {
    TestBed.inject(UserExerciseDetailService).updateSetCompleted(1, 2, 3, 4, 5, true, 10, 80, null, 8.5, 0).subscribe();
    const request = http.expectOne(API_ENDPOINTS.exerciseSetCompleted);
    expect(request.request.body.actualRpe).toBe(8.5);
    expect(request.request.body.rir).toBe(0);
    expect(request.request.body.clearRir).toBeFalse();
    expect(request.request.body.targetRpe).toBeUndefined();
    request.flush({ success: true });
  });

  it('distinguishes an old request from explicit effort clearing', () => {
    const service = TestBed.inject(UserExerciseDetailService);
    service.updateSetCompleted(1, 2, 3, 4, 5, true, 10, 80, null).subscribe();
    const old = http.expectOne(API_ENDPOINTS.exerciseSetCompleted);
    expect(old.request.body.actualRpe).toBeUndefined();
    expect(old.request.body.clearActualRpe).toBeUndefined(); old.flush({ success: true });
    service.updateSetCompleted(1, 2, 3, 4, 5, true, 10, 80, null, null, null).subscribe();
    const clear = http.expectOne(API_ENDPOINTS.exerciseSetCompleted);
    expect(clear.request.body.clearActualRpe).toBeTrue();
    expect(clear.request.body.clearRir).toBeTrue(); clear.flush({ success: true });
  });

  it('sends only target RPE from the coach and preserves athlete effort', () => {
    const service = TestBed.inject(CoachWorkspaceService);
    service.saveClientSet(5, { ...oldValues, targetRpe: 7.5 }).subscribe();
    const request = http.expectOne(API_ENDPOINTS.userWorkoutExerciseSetById(5));
    expect(request.request.body.targetRpe).toBe(7.5);
    expect(request.request.body.clearTargetRpe).toBeFalse();
    expect(request.request.body.actualRpe).toBeUndefined();
    expect(request.request.body.rir).toBeUndefined(); request.flush({ success: true });
    service.saveClientSet(5, { ...oldValues, targetRpe: null }).subscribe();
    const clear = http.expectOne(API_ENDPOINTS.userWorkoutExerciseSetById(5));
    expect(clear.request.body.clearTargetRpe).toBeTrue(); clear.flush({ success: true });
  });

  it('tracks and discards coach RPE changes while validating half-point steps', () => {
    const component = TestBed.runInInjectionContext(() => new CoachClientDetailComponent());
    const row: EditableSet = { ...oldValues, id: 5, setNumber: 1, targetRpe: 7.5, actualRpe: 9, rir: 0,
      original: { ...oldValues, targetRpe: 7.5 } };
    component.setEditor.exerciseSets = [{ loading: false, exercise: {} as never, sets: [row] }];
    expect(component.setEditor.isChanged(row)).toBeFalse();
    row.targetRpe = 8.5;
    expect(component.setEditor.isChanged(row)).toBeTrue();
    component.setEditor.discardChanges();
    expect(row.targetRpe).toBe(7.5); expect(row.actualRpe).toBe(9); expect(row.rir).toBe(0);
    row.targetRpe = 7.25; expect(component.setEditor.isInvalid(row)).toBeTrue();
    row.targetRpe = 11; expect(component.setEditor.isInvalid(row)).toBeTrue();
    row.targetRpe = null; expect(component.setEditor.values(row)!.targetRpe).toBeNull();
  });

  it('queues effort edits with captured values and leaves the confirmed timer untouched', () => {
    const responses: Subject<ApiResponse<void>>[] = [];
    const save = jasmine.createSpy().and.callFake(() => {
      const response = new Subject<ApiResponse<void>>(); responses.push(response); return response;
    });
    const component = TestBed.runInInjectionContext(() => new UserExerciseDetailComponent({} as never,
      { updateSetCompleted: save } as never, {} as never));
    component.userWorkoutId = 1; component.programId = 2; component.workoutId = 3;
    const set: UserWorkoutExerciseSetDto = { id: 5, userWorkoutExerciseId: 6, setNumber: 1, targetRepetitions: 10,
      targetWeightKg: 80, actualRepetitions: 10, actualWeightKg: 80, startedAt: null, completedAt: null,
      completed: true, notes: null, targetRpe: 8, actualRpe: 7.5, rir: 0 };
    component.workoutExercise = { exercise: { id: 4 }, userWorkoutExerciseSets: [set] } as UserWorkoutExerciseDetailDto;
    component.saveSetDetails(set, false);
    set.actualRpe = 8.5; component.saveSetDetails(set, false);
    expect(save.calls.count()).toBe(1); expect(save.calls.argsFor(0).slice(9)).toEqual([7.5, 0]);
    responses[0].next({ success: true, data: null, message: null }); responses[0].complete();
    expect(save.calls.count()).toBe(2); expect(save.calls.argsFor(1).slice(9)).toEqual([8.5, 0]);
    responses[1].next({ success: true, data: null, message: null }); responses[1].complete();
    expect(set.targetRpe).toBe(8); expect(set.completed).toBeTrue();
    expect(component.restTimerRevision).toBe(0);
    component.ngOnDestroy();
  });
});
