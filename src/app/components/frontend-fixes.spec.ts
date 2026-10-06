import {
  EnvironmentInjector,
  Injector,
  createEnvironmentInjector,
  runInInjectionContext,
} from '@angular/core';
import { HttpErrorResponse, HttpRequest, HttpResponse } from '@angular/common/http';
import { BehaviorSubject, Subject, of, throwError } from 'rxjs';
import { AuthInterceptor } from '../interceptors/auth.interceptor';
import { CoachEditService } from '../services/admin/coach-edit.service';
import { LoggerService } from '../services/logger.service';
import { CoachEditComponent } from './admin-dashboard/operations/coach-edit/coach-edit.component';
import { UserProfileComponent } from './user-dashboard/operations/user-profile/user-profile.component';
import { NewWorkoutComponent } from './coach-dashboard/operations/coach-workouts/coach-workout-new/new-workout.component';
import { AssignWorkoutsExercisesComponent } from './coach-dashboard/operations/assign-workouts-exercises/assign-workouts-exercises.component';

const coach = (id: number, name: string) => ({
  id,
  name,
  email: `${id}@example.com`,
  phone: '',
  specialization: '',
  avatarUrl: '',
  password: '',
});
const route = (params: Record<string, string | undefined> = {}) => ({
  snapshot: {
    queryParamMap: { get: (key: string) => params[key] ?? null },
    paramMap: { get: () => null },
  },
});
const failure = (status: number) => new HttpErrorResponse({ status });

describe('Frontend fixes', () => {
  let injector: EnvironmentInjector;
  beforeEach(() => {
    injector = createEnvironmentInjector(
      [{ provide: LoggerService, useValue: { error() {} } }],
      Injector.NULL as EnvironmentInjector,
    );
  });
  afterEach(() => injector.destroy());
  const make = <T>(factory: () => T): T => runInInjectionContext(injector, factory);

  function authFixture(refresh: any = of({ accessToken: 'new' })) {
    const auth = {
      getAccessToken: () => 'old',
      refreshAccessToken: jasmine.createSpy('refresh').and.returnValue(refresh),
      logout: jasmine.createSpy('logout'),
    };
    const router = { navigate: jasmine.createSpy('navigate') };
    return { auth, router, interceptor: new AuthInterceptor(auth as any, router as any) };
  }

  it('preserves the session when a retry after successful refresh returns HTTP 500', () => {
    const { auth, router, interceptor } = authFixture();
    let calls = 0;
    let received: any;
    interceptor
      .intercept(new HttpRequest('GET', '/example'), {
        handle: () => throwError(() => failure(++calls === 1 ? 401 : 500)),
      })
      .subscribe({ error: (error) => (received = error) });
    expect(received.status).toBe(500);
    expect(auth.logout).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('invalidates the session when the refresh fails or the retried request returns 401', () => {
    const failedRefresh = authFixture(throwError(() => failure(401)));
    failedRefresh.interceptor
      .intercept(new HttpRequest('GET', '/example'), {
        handle: () => throwError(() => failure(401)),
      })
      .subscribe({ error() {} });
    expect(failedRefresh.auth.logout).toHaveBeenCalledTimes(1);
    const invalidToken = authFixture();
    invalidToken.interceptor
      .intercept(new HttpRequest('GET', '/example'), {
        handle: () => throwError(() => failure(401)),
      })
      .subscribe({ error() {} });
    expect(invalidToken.auth.logout).toHaveBeenCalledTimes(1);
  });

  it('shares refresh across requests without invalidating another retry on HTTP 500', () => {
    const refresh = new Subject<any>();
    const { auth, interceptor } = authFixture(refresh);
    const calls: Record<string, number> = {};
    const next = {
      handle: (request: HttpRequest<unknown>) => {
        calls[request.url] = (calls[request.url] ?? 0) + 1;
        if (calls[request.url] === 1) return throwError(() => failure(401));
        expect(request.headers.get('Authorization')).toBe('Bearer new');
        return request.url === '/first'
          ? throwError(() => failure(500))
          : of(new HttpResponse({ status: 200 }));
      },
    };
    let secondSucceeded = false;
    interceptor.intercept(new HttpRequest('GET', '/first'), next).subscribe({ error() {} });
    interceptor
      .intercept(new HttpRequest('GET', '/second'), next)
      .subscribe(() => (secondSucceeded = true));
    refresh.next({ accessToken: 'new' });
    refresh.complete();
    expect(auth.refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(secondSucceeded).toBeTrue();
    expect(auth.logout).not.toHaveBeenCalled();
  });

  it('propagates backend coach save rejections and accepts successful saves', () => {
    const http = {
      post: jasmine.createSpy().and.returnValue(of({ success: false, message: 'Save rejected' })),
    };
    const service = new CoachEditService(http as any);
    const saved = jasmine.createSpy('saved');
    let error: any;
    service
      .updateCoach(1, coach(1, 'Anna'))
      .subscribe({ next: saved, error: (value) => (error = value) });
    expect(saved).not.toHaveBeenCalled();
    expect(error.message).toBe('Save rejected');
    http.post.and.returnValue(of({ success: true }));
    service.updateCoach(1, coach(1, 'Anna')).subscribe(saved);
    expect(saved).toHaveBeenCalledOnceWith(coach(1, 'Anna'));
  });

  it('updates the saved coach cache without overwriting a newly selected coach', () => {
    const response = new Subject<any>();
    const api = { updateCoach: jasmine.createSpy().and.returnValue(response) };
    const edit = make(() => new CoachEditComponent(api as any));
    edit.coaches = [coach(1, 'Anna'), coach(2, 'Béla')];
    edit.selectedCoachId = 1;
    edit.onSelectCoach();
    edit.onSave();
    edit.onSave();
    expect(api.updateCoach).toHaveBeenCalledTimes(1);
    edit.selectedCoachId = 2;
    edit.onSelectCoach();
    response.next(coach(1, 'Anna saved'));
    response.complete();
    expect(edit.coaches[0].name).toBe('Anna saved');
    expect(edit.coaches[1].id).toBe(2);
    expect(edit.selectedCoach.id).toBe(2);
    expect(edit.message).toBe('');
    expect(edit.saving).toBeFalse();
  });

  it('protects edits after switching away and back', () => {
    const response = new Subject<any>();
    const edit = make(() => new CoachEditComponent({ updateCoach: () => response } as any));
    edit.coaches = [coach(1, 'Anna'), coach(2, 'Béla')];
    edit.selectedCoachId = 1;
    edit.onSelectCoach();
    edit.onSave();
    edit.selectedCoachId = 2;
    edit.onSelectCoach();
    edit.selectedCoachId = 1;
    edit.onSelectCoach();
    edit.selectedCoach.name = 'New edits';
    response.next(coach(1, 'Saved old edits'));
    response.complete();
    expect(edit.selectedCoach.name).toBe('New edits');
    edit.onSave();
    expect(edit.saving).toBeFalse();
  });

  it('does not show a previous coach save error on the newly selected coach', () => {
    const pending = new Subject<any>();
    const edit = make(() => new CoachEditComponent({ updateCoach: () => pending } as any));
    edit.coaches = [coach(1, 'Anna'), coach(2, 'Béla')];
    edit.selectedCoachId = 1;
    edit.onSelectCoach();
    edit.onSave();
    edit.selectedCoachId = 2;
    edit.onSelectCoach();
    pending.error(new Error('Previous save rejected'));
    expect(edit.message).toBe('');
    expect(edit.selectedCoach.id).toBe(2);
    expect(edit.saving).toBeFalse();
  });

  it('preserves unsaved profile edits when changing UI language', () => {
    const language = new BehaviorSubject('hu');
    const getMemberById = jasmine
      .createSpy()
      .and.returnValue(
        of({ id: 1, usernameOrName: 'Original', email: 'original@example.com', extraFields: {} }),
      );
    const profile = new UserProfileComponent(
      { getCoaches: () => of([]), getMemberById } as any,
      { detectChanges() {} } as any,
      { getUserId: () => 1 } as any,
      { language$: language } as any,
    );
    profile.ngOnInit();
    profile.selectedUser.username = 'Unsaved';
    language.next('en');
    language.next('de');
    expect(profile.selectedUser.username).toBe('Unsaved');
    expect(getMemberById).toHaveBeenCalledTimes(1);
    profile.ngOnDestroy();
  });

  it('shows profile rejection as an error, unlocks retry, and blocks duplicate saves', () => {
    const pending = new Subject<any>();
    const update = jasmine.createSpy().and.returnValue(pending);
    const profile = new UserProfileComponent(
      { updateUser: update } as any,
      {} as any,
      {} as any,
      {} as any,
    );
    profile.onSave();
    expect(update).not.toHaveBeenCalled();
    profile.selectedUser.id = 1;
    profile.selectedUser.password = 'new password';
    profile.onSave();
    profile.onSave();
    expect(update).toHaveBeenCalledTimes(1);
    pending.next({ success: false, message: 'Rejected' });
    pending.complete();
    expect(profile.messageType).toBe('error');
    expect(profile.message).toBe('Rejected');
    expect(profile.selectedUser.password).toBe('new password');
    expect(profile.saving).toBeFalse();
    update.and.returnValue(of({ success: true }));
    profile.onSave();
    expect(profile.messageType).toBe('success');
    expect(profile.selectedUser.password).toBe('');
    profile.ngOnDestroy();
  });

  it('preselects a workoutId from both normal creation and program builder', () => {
    for (const params of [
      { workoutId: '123' },
      { workoutId: '123', fromProgramBuilder: 'true', programId: '4' },
    ]) {
      const load = jasmine
        .createSpy()
        .and.returnValue(of({ success: true, data: { workoutId: 123, workoutName: 'Created' } }));
      const page = new AssignWorkoutsExercisesComponent(
        {} as any,
        route(params) as any,
        {} as any,
        { getWorkoutById: load } as any,
      );
      page.ngOnInit();
      expect(page.selectedWorkoutIds).toEqual([123]);
      expect(page.selectedWorkout?.id).toBe(123);
      page.ngOnDestroy();
    }
  });

  it('cancels stale workout summaries on switching and clearing selection', () => {
    const first = new Subject<any>();
    const second = new Subject<any>();
    const page = new AssignWorkoutsExercisesComponent(
      {} as any,
      route() as any,
      {} as any,
      { getWorkoutById: (id: number) => (id === 1 ? first : second) } as any,
    );
    page.selectWorkout(1);
    page.selectWorkout(2);
    first.next({ success: true, data: { workoutId: 1 } });
    expect(page.selectedWorkout).toBeNull();
    second.next({ success: true, data: { workoutId: 2 } });
    expect(page.selectedWorkout?.id).toBe(2);
    page.changeWorkout();
    second.next({ success: true, data: { workoutId: 2 } });
    expect(page.selectedWorkoutIds).toEqual([]);
    expect(page.selectedWorkout).toBeNull();
    page.ngOnDestroy();
  });

  it('blocks duplicate workout creation and allows retry after rejection', () => {
    const pending = new Subject<any>();
    const api = { addWorkout: jasmine.createSpy().and.returnValue(pending) };
    const router = { navigate: jasmine.createSpy() };
    const page = make(
      () => new NewWorkoutComponent(api as any, {} as any, route() as any, router as any),
    );
    page.addWorkout();
    page.addWorkout();
    expect(api.addWorkout).toHaveBeenCalledTimes(1);
    pending.next({ success: false, message: 'Rejected' });
    pending.complete();
    expect(page.saving).toBeFalse();
    expect(page.messageType).toBe('error');
    expect(router.navigate).not.toHaveBeenCalled();
    api.addWorkout.and.returnValue(of({ success: true, data: { id: 123 } }));
    page.addWorkout();
    expect(router.navigate).toHaveBeenCalledOnceWith(['/coach/assign-workouts-exercises'], {
      queryParams: { workoutId: 123 },
    });
    page.ngOnDestroy();
  });

  it('keeps program builder parameters and does not navigate on a missing workout ID', () => {
    const api = {
      addWorkout: jasmine.createSpy().and.returnValue(of({ success: true, data: {} })),
    };
    const router = { navigate: jasmine.createSpy() };
    const page = make(
      () =>
        new NewWorkoutComponent(
          api as any,
          {} as any,
          route({ fromProgramBuilder: 'true', programId: '4' }) as any,
          router as any,
        ),
    );
    page.addWorkout();
    expect(page.message).toBe('newWorkout.createIdMissing');
    expect(router.navigate).not.toHaveBeenCalled();
    api.addWorkout.and.returnValue(of({ success: true, data: { id: 123 } }));
    page.addWorkout();
    expect(router.navigate).toHaveBeenCalledOnceWith(['/coach/assign-workouts-exercises'], {
      queryParams: { workoutId: 123, fromProgramBuilder: 'true', programId: '4' },
    });
    page.ngOnDestroy();
  });

  it('cancels workout creation on destruction and unlocks on HTTP failure', () => {
    const pending = new Subject<any>();
    const router = { navigate: jasmine.createSpy() };
    const page = make(
      () =>
        new NewWorkoutComponent(
          { addWorkout: () => pending } as any,
          {} as any,
          route() as any,
          router as any,
        ),
    );
    page.addWorkout();
    pending.error(failure(500));
    expect(page.saving).toBeFalse();
    expect(page.messageType).toBe('error');
    const late = new Subject<any>();
    const destroyed = make(
      () =>
        new NewWorkoutComponent(
          { addWorkout: () => late } as any,
          {} as any,
          route() as any,
          router as any,
        ),
    );
    destroyed.addWorkout();
    destroyed.ngOnDestroy();
    late.next({ success: true, data: { id: 123 } });
    expect(router.navigate).not.toHaveBeenCalled();
    expect(destroyed.saving).toBeFalse();
  });
});
