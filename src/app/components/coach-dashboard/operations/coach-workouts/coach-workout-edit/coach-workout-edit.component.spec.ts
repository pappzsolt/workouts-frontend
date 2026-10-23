import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { BehaviorSubject, of, Subject } from 'rxjs';
import { CoachWorkoutEditComponent } from './coach-workout-edit.component';
import { LoggerService } from '../../../../../services/logger.service';
import { CoachWorkoutsService } from '../../../../../services/coach/coach-workouts/coach-workouts.service';
import { WorkoutExerciseService } from '../../../../../services/coach/workout-exercises.service';
import { ExerciseService } from '../../../../../services/coach/coach-exercises/coach-exercises.service';
import { ProgramWorkoutService } from '../../../../../services/coach/program-workout.service';
import { LanguageService } from '../../../../../services/shared/language.service';
import { CoachWorkspaceService } from '../../../../../services/coach/coach-workspace.service';

describe('Coach workout editor language reloads', () => {
  let language$: BehaviorSubject<string>;
  beforeEach(() => language$ = new BehaviorSubject('hu'));
  function create() {
    TestBed.configureTestingModule({providers: [
      {provide: LoggerService, useValue: {error: () => {}}},
      {provide: ActivatedRoute, useValue: {snapshot: {paramMap: convertToParamMap({id: '7'})}}},
      {provide: Router, useValue: {}},
      {provide: CoachWorkoutsService, useValue: {getWorkoutById: () => of({success: true, data: {workoutId: 7, workoutName: 'Saved name'}})}},
      {provide: WorkoutExerciseService, useValue: {assignExerciseToWorkout: () => of({success: false, message: 'Rejected'})}},
      {provide: ExerciseService, useValue: {}},
      {provide: ProgramWorkoutService, useValue: {}},
      {provide: LanguageService, useValue: {language$}},
      {provide: CoachWorkspaceService, useValue: {}},
    ]});
    return TestBed.runInInjectionContext(() => new CoachWorkoutEditComponent(
      TestBed.inject(ActivatedRoute), TestBed.inject(Router), TestBed.inject(CoachWorkoutsService),
      TestBed.inject(WorkoutExerciseService), TestBed.inject(ExerciseService),
      TestBed.inject(ProgramWorkoutService), TestBed.inject(LanguageService)));
  }
  it('preserves an edited workout name on language change', () => {
    const component = create();
    spyOn(component, 'loadExercises');
    spyOn(component, 'loadWorkoutExercises');
    spyOn(component, 'checkProgramAssignment');
    spyOn<any>(component, 'loadUsage');
    component.ngOnInit();
    component.workout.name = 'Unsaved new name';
    language$.next('en');
    expect(component.workout.name).toBe('Unsaved new name');
  });
  it('ignores a late previous workout response', () => {
    const component = create();
    const oldResponse = new Subject<any>();
    const newResponse = new Subject<any>();
    spyOn(TestBed.inject(CoachWorkoutsService), 'getWorkoutById').and.returnValues(oldResponse, newResponse);
    component.workoutId = 7;
    component.loadWorkout();
    component.loadWorkout();
    newResponse.next({success: true, data: {workoutId: 7, workoutName: 'English name'}});
    oldResponse.next({success: true, data: {workoutId: 7, workoutName: 'Magyar név'}});
    expect(component.workout.name).toBe('English name');
  });
  it('preserves edits made while a language reload is pending and refreshes untouched fields', () => {
    const component = create();
    component.workoutId = 7;
    component.loadWorkout();
    const response = new Subject<any>();
    spyOn(TestBed.inject(CoachWorkoutsService), 'getWorkoutById').and.returnValue(response);
    component.loadWorkout(true);
    component.workout.name = 'Typed during reload';
    component.workout.durationMinutes = 45;
    response.next({success: true, data: {workoutId: 7, workoutName: 'English name', workoutDescription: 'English description', durationMinutes: 30}});
    expect(component.workout.name).toBe('Typed during reload');
    expect(component.workout.durationMinutes).toBe(45);
    expect(component.workout.description).toBe('English description');
  });

  it('preserves edits made before the first response when language changes', () => {
    const component = create();
    component.workoutId = 7;
    const first = new Subject<any>();
    const latest = new Subject<any>();
    spyOn(TestBed.inject(CoachWorkoutsService), 'getWorkoutById').and.returnValues(first, latest);
    component.loadWorkout();
    component.workout.name = 'Initial draft';
    component.loadWorkout(true);
    latest.next({success: true, data: {workoutId: 7, workoutName: 'Translated server name'}});
    expect(component.workout.name).toBe('Initial draft');
  });

  it('ignores old exercise catalog responses after a newer load', () => {
    const component = create();
    const oldResponse = new Subject<any>();
    const newResponse = new Subject<any>();
    const service = TestBed.inject(ExerciseService);
    Object.assign(service, {getAllExercises: jasmine.createSpy().and.returnValues(oldResponse, newResponse)});
    component.loadExercises();
    component.loadExercises();
    newResponse.next({success: true, data: [{id: 1, name: 'English'}]});
    oldResponse.next({success: true, data: [{id: 1, name: 'Magyar'}]});
    expect(component.exercises[0].name).toBe('English');
  });

  it('ignores old workout exercise errors after a newer successful load', () => {
    const component = create();
    component.workoutId = 7;
    const oldResponse = new Subject<any>();
    const newResponse = new Subject<any>();
    Object.assign(TestBed.inject(ExerciseService), {getWorkoutExercises: jasmine.createSpy().and.returnValues(oldResponse, newResponse)});
    component.loadWorkoutExercises();
    component.loadWorkoutExercises();
    newResponse.next({exercises: [{id: 1, workoutId: 7, exercise: {id: 12, name: 'English'}}]});
    oldResponse.error(new Error('Old request failed'));
    expect(component.workoutExercises[0].exercise?.name).toBe('English');
    expect(component.messageType).toBe('');
  });
});
