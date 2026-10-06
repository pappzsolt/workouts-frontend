import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { convertToParamMap } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { AuthService } from '../services/auth/auth.service';
import { CoachProfileService } from '../services/coach/coach-profile.service';
import { LoggerService } from '../services/logger.service';
import { CoachProfileComponent } from './coach-dashboard/operations/coach-profile/coach-profile.component';
import { CoachProgramComponent } from './coach-dashboard/operations/coach-programs/coach-program/coach-program.component';
import { NewExerciseComponent } from './coach-dashboard/operations/coach-exercises/coach-exercise-new/new-exercise.component';
import { UserExerciseDetailComponent } from './user-dashboard/operations/user-exercises/user-exercises-detail/user-exercises-detail.component';
import { WorkoutsComponent } from './user-dashboard/operations/user-workouts/workouts.component';

const response = (success: boolean, message: string, data: any = null) => ({ success, message, data });
const language = { language$: new BehaviorSubject('hu'), getCurrentLanguage: () => 'hu' };

describe('Backend messages presented by coach and user components', () => {
  let profileApi: any;
  beforeEach(() => {
    profileApi = jasmine.createSpyObj('CoachProfileService', ['saveCoachProfile']);
    TestBed.configureTestingModule({ providers: [
      { provide: AuthService, useValue: {} },
      { provide: CoachProfileService, useValue: profileApi },
      { provide: LoggerService, useValue: { error: () => undefined } },
    ] });
  });

  it('does not clear a coach password or report success when the save was rejected', () => {
    const component = TestBed.runInInjectionContext(() => new CoachProfileComponent());
    component.profile.id = 1; component.profile.password_hash = 'new-password';
    profileApi.saveCoachProfile.and.returnValue(of(response(false, 'Profile rejected')));
    component.saveProfile();
    expect(component.message).toBe('Profile rejected'); expect(component.messageType).toBe('error');
    expect(component.profile.password_hash).toBe('new-password');
  });

  it('displays the actual coach profile save message', () => {
    const component = TestBed.runInInjectionContext(() => new CoachProfileComponent());
    component.profile.id = 1;
    profileApi.saveCoachProfile.and.returnValue(of(response(true, 'Profile saved')));
    component.saveProfile();
    expect(component.message).toBe('Profile saved'); expect(component.messageType).toBe('success');
  });

  it('keeps the program deletion message after refreshing the list', () => {
    const api = { deleteCoachProgram: () => of(response(true, 'Program deleted')),
      searchProgramsForCoach: () => of({ content: [], totalElements: 0, totalPages: 0 }) };
    const component = TestBed.runInInjectionContext(() => new CoachProgramComponent({} as any, api as any, language as any));
    component.pendingDeleteProgramId = 7; component.confirmDeleteProgram();
    expect(component.message).toBe('Program deleted'); expect(component.messageType).toBe('success');
  });

  it('keeps the program and confirmation state when deletion was rejected', () => {
    const refresh = jasmine.createSpy('refresh');
    const api = { deleteCoachProgram: () => of(response(false, 'Deletion denied')), searchProgramsForCoach: refresh };
    const component = TestBed.runInInjectionContext(() => new CoachProgramComponent({} as any, api as any, language as any));
    component.pendingDeleteProgramId = 7; component.confirmDeleteProgram();
    expect(component.message).toBe('Deletion denied'); expect(component.messageType).toBe('error');
    expect(component.pendingDeleteProgramId).toBe(7); expect(refresh).not.toHaveBeenCalled();
  });

  it('does not reset the new exercise form on success:false', () => {
    const api = { addExercise: () => of(response(false, 'Exercise rejected')) };
    const component = TestBed.runInInjectionContext(() => new NewExerciseComponent(api as any));
    component.newExercise.name = 'Exercise'; component.addExercise();
    expect(component.message).toBe('Exercise rejected'); expect(component.messageType).toBe('error');
    expect(component.newExercise.name).toBe('Exercise');
  });

  it('does not mark a set completed when the backend rejected it', () => {
    const api = { updateSetCompleted: () => of(response(false, 'Set rejected')) };
    const component = TestBed.runInInjectionContext(() => new UserExerciseDetailComponent({} as any, api as any, language as any));
    component.workoutExercise = { exercise: { id: 2 }, userWorkoutExerciseSets: [] } as any;
    const set = { id: 3, completed: false } as any;
    component.updateSetCompleted(set, true);
    expect(set.completed).toBeFalse(); expect(component.message).toBe('Set rejected'); expect(component.messageType).toBe('error');
    component.ngOnDestroy();
  });

  it('preserves the backend set-save message for details and completion', () => {
    const api = { updateSetCompleted: () => of(response(true, 'Set saved')) };
    const component = TestBed.runInInjectionContext(() => new UserExerciseDetailComponent({} as any, api as any, language as any));
    component.workoutExercise = { exercise: { id: 2 }, userWorkoutExerciseSets: [] } as any;
    const set = { id: 3, completed: false } as any;
    component.saveSetDetails(set); expect(component.message).toBe('Set saved');
    component.updateSetCompleted(set, true); expect(component.message).toBe('Set saved');
    expect(component.messageType).toBe('success'); component.ngOnDestroy();
  });

  it('reports a failed set-details save once and preserves its backend message', () => {
    const save = jasmine.createSpy('save').and.returnValue(of(response(false, 'Details rejected')));
    const component = TestBed.runInInjectionContext(() => new UserExerciseDetailComponent({} as any, { updateSetCompleted: save } as any, language as any));
    component.workoutExercise = { exercise: { id: 2 }, userWorkoutExerciseSets: [] } as any;
    component.saveSetDetails({ id: 3, completed: false } as any);
    expect(save).toHaveBeenCalledTimes(1);
    expect(component.message).toBe('Details rejected'); expect(component.messageType).toBe('error');
    component.ngOnDestroy();
  });

  it('shows workout HTTP errors and leaves the successful empty-state view disabled', () => {
    const route = { snapshot: { paramMap: convertToParamMap({ id: '7' }), queryParamMap: convertToParamMap({ programName: 'Program' }) } };
    const api = { getWorkoutsByProgram: () => throwError(() => new HttpErrorResponse({ status: 403, error: { message: 'Workouts denied' } })) };
    const component = TestBed.runInInjectionContext(() => new WorkoutsComponent(route as any, {} as any, api as any, {} as any, language as any));
    component.ngOnInit();
    expect(component.message).toBe('Workouts denied'); expect(component.messageType).toBe('error'); expect(component.loaded).toBeFalse();
    expect(component.loading).toBeFalse(); component.ngOnDestroy();
  });
});
