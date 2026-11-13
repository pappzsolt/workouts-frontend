import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { BehaviorSubject, Subject, of } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { LoggerService } from '../../../../services/logger.service';
import { LanguageService } from '../../../../services/shared/language.service';
import { UserMyProgramsService } from '../../../../services/user/user-my-program/user-my-programs.service';
import { UserWorkoutsService } from '../../../../services/user/user-workouts/user-workouts.service';
import { WorkoutsComponent } from './workouts.component';
import type { UserWorkoutOccurrence } from '../../../../models/user-workout-occurrence.model';
import type { ApiResponse } from '../../../../models/backend-dto/common/api-response';

describe('User workout program route changes', () => {
  it('replaces the previous program and cancels stale responses when only the ID changes', () => {
    const params = new BehaviorSubject(convertToParamMap({ id: '1' }));
    const query = new BehaviorSubject(convertToParamMap({ programName: 'First' }));
    const first = new Subject<ApiResponse<UserWorkoutOccurrence[]>>();
    const second = new Subject<ApiResponse<UserWorkoutOccurrence[]>>();
    const getWorkouts = jasmine.createSpy('getWorkoutsByProgram').and.callFake((id: number) => id === 1 ? first : second);
    TestBed.configureTestingModule({ providers: [
      { provide: LoggerService, useValue: { error: jasmine.createSpy('error') } },
      { provide: UserMyProgramsService, useValue: { getPrograms: () => of({ success: true, data: [] }) } },
    ] });
    const component = TestBed.runInInjectionContext(() => new WorkoutsComponent(
      { paramMap: params, queryParamMap: query } as unknown as ActivatedRoute,
      { navigate: jasmine.createSpy('navigate') } as unknown as Router,
      { getWorkoutsByProgram: getWorkouts } as unknown as UserWorkoutsService,
      {} as TranslateService,
      { language$: new BehaviorSubject('hu') } as unknown as LanguageService,
    ));
    component.ngOnInit();
    expect(getWorkouts).toHaveBeenCalledWith(1);
    query.next(convertToParamMap({ programName: 'Second' }));
    params.next(convertToParamMap({ id: '2' }));
    expect(component.programId).toBe(2);
    expect(component.programName).toBe('Second');
    expect(first.observed).toBeFalse();
    first.next({ success: true, message: null, data: [{ workoutId: 99, workoutDate: '2026-01-01', completed: false } as UserWorkoutOccurrence] });
    expect(component.workouts).toEqual([]);
    second.next({ success: true, message: null, data: [{ workoutId: 12, workoutDate: '2026-02-01', completed: false } as UserWorkoutOccurrence] });
    expect(component.workouts[0].workoutId).toBe(12);
    component.ngOnDestroy();
  });
});
