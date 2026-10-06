import {
  EnvironmentInjector,
  Injector,
  createEnvironmentInjector,
  runInInjectionContext,
} from '@angular/core';
import { BehaviorSubject, of } from 'rxjs';
import { LoggerService } from '../services/logger.service';
import { LanguageService } from '../services/shared/language.service';
import { CoachProgramSelectService } from '../services/coach/coach-program-select/coach-program-select.service';
import { UserNameIdService } from '../services/user/user-name-id.service';
import { AppSearchComponent } from './shared/components/app-search/app-search.component';
import { matchesSearch } from './shared/components/app-search/search-match';
import { AdminListUsersComponent } from './admin-dashboard/operations/admin-list-users/admin-list-users.component';
import { MemberSearchComponent } from './admin-dashboard/operations/user-search/member-search.component';
import { LoginAuditLogsComponent } from './admin-dashboard/operations/login-audit-logs/login-audit-logs.component';
import { ExerciseControllerComponent } from './coach-dashboard/operations/coach-exercises/coach-exercises.component';
import { CoachWorkoutEditComponent } from './coach-dashboard/operations/coach-workouts/coach-workout-edit/coach-workout-edit.component';
import { UserMyProgramsComponent } from './user-dashboard/operations/user-my-programs/user-my-programs.component';
import { CoachProgramBoardComponent } from './shared/coach/coach-program-board/coach-program-board.component';
import { UserMultiSelectComponent } from './shared/user/user-multi-select.component';
import { UserSelectComponent } from './shared/user/user-select.component';
import { CoachSelectComponent } from './shared/coach/coach-select.component';
import { CoachProgramSelectComponent } from './shared/programs/coach-program-select.component';
import { UserWorkoutsCalendarComponent } from './user-dashboard/operations/user-workouts-calendar/user-workouts-calendar.component';

const ok = (data: any = []) => ({ success: true, data, message: null });

describe('Shared search integration', () => {
  let injector: EnvironmentInjector;
  const language = { language$: new BehaviorSubject('hu'), getCurrentLanguage: () => 'hu' };
  beforeEach(() => {
    injector = createEnvironmentInjector(
      [
        { provide: LoggerService, useValue: { error() {}, warn() {} } },
        { provide: LanguageService, useValue: language },
        { provide: CoachProgramSelectService, useValue: { getMyPrograms: () => of(ok([])) } },
        {
          provide: UserNameIdService,
          useValue: {
            getAllUsers: () =>
              of(
                ok([
                  { id: 1, username: 'Anna' },
                  { id: 2, username: 'Béla' },
                ]),
              ),
          },
        },
      ],
      Injector.NULL as EnvironmentInjector,
    );
  });
  afterEach(() => injector.destroy());
  const make = <T>(factory: () => T): T => runInInjectionContext(injector, factory);

  it('matches case and surrounding spaces and handles missing display text', () => {
    expect(matchesSearch('  BÉLA ', null, 'Béla')).toBeTrue();
    expect(matchesSearch('absent', undefined, null)).toBeFalse();
    expect(matchesSearch('  ', undefined)).toBeTrue();
  });

  it('filters admin users before paginating and resets the page when the query changes', () => {
    const users = Array.from({ length: 14 }, (_, i) => ({
      id: i + 1,
      username: `User ${i + 1}`,
      email: `${i + 1}@example.com`,
      roles: [i === 13 ? 'ROLE_ADMIN' : 'ROLE_USER'],
    }));
    const component = make(() => new AdminListUsersComponent({ getUsers: () => of(users) } as any));
    component.currentPage = 3;
    component.onSearchChange('role_admin');
    expect(component.currentPage).toBe(1);
    expect(component.totalPages).toBe(1);
    expect(component.paginatedUsers.map((user) => user.id)).toEqual([14]);
    component.onSearchChange('13@example');
    expect(component.paginatedUsers.map((user) => user.id)).toEqual([13]);
    component.onSearchChange('missing');
    expect(component.paginatedUsers).toEqual([]);
    component.onSearchChange('');
    expect(component.totalPages).toBe(3);
    expect(component.users.length).toBe(14);
  });

  it('filters user program descriptions without reducing progress requests to the visible subset', () => {
    const programs = [
      { id: 1, name: 'First', description: null },
      { id: 2, name: 'Second', description: 'Endurance' },
      { id: 3, name: null, description: null },
    ];
    const progress = jasmine.createSpy('getProgramProgress').and.returnValue(of(ok([])));
    const component = new UserMyProgramsComponent(
      { getPrograms: () => of(ok(programs)), getProgramProgress: progress } as any,
      {} as any,
      language as any,
    );
    component.searchTerm = 'endurance';
    component.ngOnInit();
    expect(component.totalItems).toBe(1);
    expect(component.paginatedPrograms.map((program) => program.id)).toEqual([2]);
    expect(progress).toHaveBeenCalledOnceWith([1, 2, 3]);
    component.currentPage = 3;
    component.onSearchChange('missing');
    expect(component.currentPage).toBe(1);
    expect(component.totalItems).toBe(0);
    component.onSearchChange('');
    expect(component.totalItems).toBe(3);
    component.ngOnDestroy();
  });

  it('retains the program board selection when filtering hides its card', () => {
    const component = make(() => new CoachProgramBoardComponent());
    component.programs = [
      { programId: 1, programName: 'Strength' },
      { programId: 2, programName: 'Cardio', programDescription: 'Endurance' },
    ];
    component.onSelectProgram(1);
    const selected = jasmine.createSpy('selected');
    component.programSelected.subscribe(selected);
    component.searchTerm = 'endurance';
    expect(component.filteredPrograms.map((program) => program.programId)).toEqual([2]);
    expect(component.selectedProgramId).toBe(1);
    expect(selected).not.toHaveBeenCalled();
    component.searchTerm = '';
    expect(component.filteredPrograms.length).toBe(2);
    component.ngOnDestroy();
  });

  it('keeps hidden and assigned multi-select users selected and validates the full user collection', () => {
    const component = make(() => new UserMultiSelectComponent());
    component.selectedUserIds = [1, 2];
    component.assignedUserIds = [1];
    component.ngOnInit();
    const changed = jasmine.createSpy('changed');
    component.selectedUserIdsChange.subscribe(changed);
    component.searchTerm = 'béla';
    component.ngOnChanges();
    expect(component.filteredUsers.map((user) => user.id)).toEqual([2]);
    expect(component.ready).toBeTrue();
    expect(component.selectedUserIds).toEqual([1, 2]);
    expect(component.assignedUserIds).toEqual([1]);
    expect(changed).not.toHaveBeenCalled();
    component.searchTerm = '';
    expect(component.filteredUsers.length).toBe(2);
  });

  it('preserves the selected user option while searching another name', () => {
    const component = make(() => new UserSelectComponent({} as any));
    component.users = [
      { id: 1, username: 'Anna' },
      { id: 2, username: 'Béla' },
    ];
    component.selectedUserId = 1;
    component.searchTerm = 'béla';
    expect(component.matchingOptions.map((user) => user.id)).toEqual([2]);
    expect(component.userOptions.map((option) => option.value)).toEqual([1, 2]);
    expect(component.selectedUserId).toBe(1);
    component.searchTerm = 'missing';
    expect(component.matchingOptions).toEqual([]);
    expect(component.userOptions.map((option) => option.value)).toEqual([1]);
  });

  it('preserves the selected coach option while filtering names', () => {
    const component = make(() => new CoachSelectComponent({} as any));
    component.coaches = [
      { id: 1, name: 'Anna' },
      { id: 2, name: 'Béla' },
    ];
    component.selectedCoachId = 1;
    component.searchTerm = 'béla';
    expect(component.matchingOptions.map((coach) => coach.id)).toEqual([2]);
    expect(component.coachOptions.map((option) => option.value)).toEqual([1, 2]);
    expect(component.selectedCoachId).toBe(1);
  });

  it('keeps a selected program ready when filtering hides it from the matching results', () => {
    const component = make(() => new CoachProgramSelectComponent());
    component.programs = [
      { programId: 1, programName: 'Strength' },
      { programId: 2, programName: 'Cardio', programDescription: 'Endurance' },
    ];
    component.selectedProgramId = 1;
    component.searchTerm = 'endurance';
    const ready = jasmine.createSpy('ready');
    component.readyChange.subscribe(ready);
    component.ngOnChanges();
    expect(component.matchingOptions.map((program) => program.programId)).toEqual([2]);
    expect(component.programOptions.map((option) => option.value)).toEqual([1, 2]);
    expect(ready).toHaveBeenCalledOnceWith(true);
  });

  it('selects the first matching user and emits selection events only when it changes', () => {
    const component = make(() => new UserSelectComponent({} as any));
    component.users = [{ id: 1, username: 'Anna' }, { id: 2, username: 'Béla' }, { id: 3, username: 'Béla Junior' }];
    component.selectedUserId = 1;
    const changed = jasmine.createSpy('changed');
    const selected = jasmine.createSpy('selected');
    component.selectedUserIdChange.subscribe(changed);
    component.userSelected.subscribe(selected);
    component.onSearchChange('béla');
    expect(component.selectedUserId).toBe(2);
    expect(changed).toHaveBeenCalledOnceWith(2);
    expect(selected).toHaveBeenCalledOnceWith(component.users[1]);
    component.onSearchChange('BÉLA');
    component.onSearchChange('missing');
    component.onSearchChange('');
    expect(component.selectedUserId).toBe(2);
    expect(changed).toHaveBeenCalledTimes(1);
  });

  it('selects and emits the first matching coach', () => {
    const component = make(() => new CoachSelectComponent({} as any));
    component.coaches = [{ id: 1, name: 'Anna' }, { id: 2, name: 'Béla' }];
    component.selectedCoachId = 1;
    const changed = jasmine.createSpy('changed');
    component.selectedCoachIdChange.subscribe(changed);
    component.onSearchChange('béla');
    expect(component.selectedCoachId).toBe(2);
    expect(changed).toHaveBeenCalledOnceWith(2);
  });

  it('selects the first matching program by description and updates readiness', () => {
    const component = make(() => new CoachProgramSelectComponent());
    component.programs = [{ programId: 1, programName: 'Strength' }, { programId: 2, programName: 'Cardio', programDescription: 'Endurance' }];
    component.selectedProgramId = 1;
    const changed = jasmine.createSpy('changed');
    const ready = jasmine.createSpy('ready');
    component.selectedProgramIdChange.subscribe(changed);
    component.readyChange.subscribe(ready);
    component.onSearchChange('endurance');
    expect(component.selectedProgramId).toBe(2);
    expect(changed).toHaveBeenCalledOnceWith(2);
    expect(ready).toHaveBeenCalledOnceWith(true);
    component.onSearchChange('missing');
    component.onSearchChange('');
    expect(component.selectedProgramId).toBe(2);
    expect(changed).toHaveBeenCalledTimes(1);
  });

  it('filters calendar occurrences by name without changing dates, month, or the selected occurrence', () => {
    const workouts = [
      { userWorkoutId: 10, workoutName: 'Strength', scheduledAt: '2035-03-02' },
      { userWorkoutId: 20, workoutName: 'Cardio', scheduledAt: '2035-03-02' },
      { userWorkoutId: 30, workoutName: 'Strength', scheduledAt: '2035-03-05' },
    ];
    const component = make(
      () =>
        new UserWorkoutsCalendarComponent(
          {
            getScheduledWorkouts: () => of(ok(workouts)),
            getExercisesForUserWorkout: () => of([]),
          } as any,
          language as any,
        ),
    );
    component.currentYear = 2035;
    component.currentMonth = 2;
    component.ngOnInit();
    component.selectWorkout(component.scheduledWorkouts[1]);
    component.onSearchChange('strength');
    expect(
      component.getWorkoutsForDay(new Date(2035, 2, 2)).map((workout) => workout.userWorkoutId),
    ).toEqual([10]);
    expect(
      component.getWorkoutsForDay(new Date(2035, 2, 5)).map((workout) => workout.userWorkoutId),
    ).toEqual([30]);
    expect(component.selectedWorkout?.userWorkoutId).toBe(20);
    expect(component.scheduledWorkouts.length).toBe(3);
    expect(component.currentMonth).toBe(2);
    component.onSearchChange('missing');
    expect(component.hasWorkoutsInCurrentMonth()).toBeFalse();
    component.onSearchChange('');
    expect(component.getWorkoutsForDay(new Date(2035, 2, 2)).length).toBe(2);
    component.ngOnDestroy();
  });

  it('uses the latest coach exercise query with the selected search field and resets paging on submit', () => {
    const search = jasmine
      .createSpy('searchExercises')
      .and.returnValue(of(ok({ content: [], totalElements: 0, totalPages: 0 })));
    const component = make(
      () =>
        new ExerciseControllerComponent(
          { searchExercises: search } as any,
          {} as any,
          {} as any,
          language as any,
        ),
    );
    const field = make(() => new AppSearchComponent());
    field.debounceMs = 0;
    field.searchTermChange.subscribe((term) => {
      component.searchTerm = term;
    });
    component.searchField = 'name';
    component.currentPage = 4;
    field.onSearchChange('Latest exercise');
    component.search();
    expect(search.calls.mostRecent().args.slice(0, 3)).toEqual(['Latest exercise', 'name', 0]);
    component.ngOnDestroy();
  });

  it('keeps assigned exercise exclusions while filtering workout additions and resets selection on clear', () => {
    const component = make(
      () =>
        new CoachWorkoutEditComponent(
          {} as any,
          {} as any,
          {} as any,
          {} as any,
          {} as any,
          {} as any,
          language as any,
        ),
    );
    component.exercises = [
      { id: 1, name: 'Squat' },
      { id: 2, name: 'Bench' },
    ] as any;
    const field = make(() => new AppSearchComponent());
    field.debounceMs = 0;
    field.searchTermChange.subscribe((term) => component.onExerciseSearchChange(term));
    field.onSearchChange('squat');
    expect(component.availableExercises.map((exercise) => exercise.id)).toEqual([1]);
    component.selectedExerciseId = 1;
    field.clear();
    expect(component.selectedExerciseId).toBeNull();
    expect(component.availableExercises.length).toBe(2);
    component.workoutAssignedToProgram = true;
    field.onSearchChange('bench');
    expect(component.availableExercises).toEqual([]);
  });

  it('passes the just-typed member query to manual search without waiting for a debounce', () => {
    const search = jasmine.createSpy('searchMembers').and.returnValue(of(ok([])));
    const component = make(() => new MemberSearchComponent({ searchMembers: search } as any));
    const field = make(() => new AppSearchComponent());
    field.debounceMs = 0;
    field.searchTermChange.subscribe((term) => {
      component.keyword = term;
    });
    field.onSearchChange('Latest query');
    component.onSearch();
    expect(search).toHaveBeenCalledOnceWith('Latest query');
  });

  it('passes the just-typed audit username to applyFilters and clears it through clearFilters', () => {
    const load = jasmine
      .createSpy('getLoginAuditLogs')
      .and.returnValue(of({ content: [], page: 0, size: 50, totalElements: 0, totalPages: 0 }));
    const component = make(() => new LoginAuditLogsComponent({ getLoginAuditLogs: load } as any));
    const field = make(() => new AppSearchComponent());
    field.debounceMs = 0;
    field.searchTermChange.subscribe((term) => {
      component.filters.username = term;
    });
    field.onSearchChange('Latest user');
    component.applyFilters();
    expect(load.calls.mostRecent().args[0].username).toBe('Latest user');
    component.clearFilters();
    expect(load.calls.mostRecent().args[0].username).toBe('');
  });
});
