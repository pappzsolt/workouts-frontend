import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { BehaviorSubject, of, Subject } from 'rxjs';
import { CoachWorkoutEditComponent } from './coach-workout-edit.component';
import { CoachWorkoutsService } from '../../../../../services/coach/coach-workouts/coach-workouts.service';
import { WorkoutExerciseService } from '../../../../../services/coach/workout-exercises.service';
import { ExerciseService } from '../../../../../services/coach/coach-exercises/coach-exercises.service';
import { ProgramWorkoutService } from '../../../../../services/coach/program-workout.service';
import { LanguageService } from '../../../../../services/shared/language.service';
import { CoachWorkspaceService } from '../../../../../services/coach/coach-workspace.service';
import { LoggerService } from '../../../../../services/logger.service';
import { API_ENDPOINTS } from '../../../../../api-endpoints';
import type { ApiResponse } from '../../../../../models/backend-dto/common/api-response';
import type { UserWorkoutDto } from '../../../../../models/backend-dto/workout/user-workout-dto';

describe('Workout language-bound saves', () => {
  for (const scenario of ['pending', 'failed', 'loaded', 'roundtrip']) {
    it(`isolates form language in the ${scenario} case`, () => {
      const language$ = new BehaviorSubject('hu');
      const english = new Subject<ApiResponse<UserWorkoutDto>>();
      TestBed.configureTestingModule({providers: [provideHttpClient(), provideHttpClientTesting(),
        {provide: LanguageService, useValue: {language$, getCurrentLanguage: () => language$.value}},
        {provide: ActivatedRoute, useValue: {paramMap: of(convertToParamMap({id: '7'}))}},
        {provide: Router, useValue: {}}, {provide: LoggerService, useValue: {error: () => {}}},
        {provide: CoachWorkspaceService, useValue: {}},
      ]});
      const service = TestBed.inject(CoachWorkoutsService);
      spyOn(service, 'getWorkoutById').and.returnValues(of({success: true, message: null, data: {workoutId: 7, workoutName: 'Magyar név'} as UserWorkoutDto}), english);
      const component = TestBed.runInInjectionContext(() => new CoachWorkoutEditComponent(
        TestBed.inject(ActivatedRoute), TestBed.inject(Router), service,
        {} as WorkoutExerciseService, {} as ExerciseService, {} as ProgramWorkoutService, TestBed.inject(LanguageService)));
      spyOn(component, 'loadExercises'); spyOn(component, 'loadWorkoutExercises');
      spyOn(component, 'checkProgramAssignment'); spyOn<any>(component, 'loadUsage');
      component.ngOnInit();
      component.workout.name = 'Magyar piszkozat';
      component.workout.description = 'Magyar leírás';
      language$.next('en');
      if (scenario === 'loaded' || scenario === 'roundtrip') {
        english.next({success: true, message: null, data: {workoutId: 7, workoutName: 'English name', workoutDescription: 'English description'} as UserWorkoutDto});
        english.complete();
      }
      if (scenario === 'failed') english.error(new Error('Load failed'));
      const http = TestBed.inject(HttpTestingController);
      component.saveWorkout();
      if (scenario === 'pending' || scenario === 'failed') {
        expect(component.canSaveWorkout).toBeFalse();
        http.expectNone(req => req.method === 'PUT');
        http.verify();
        return;
      }
      const save = http.expectOne(req => req.method === 'PUT' && req.url === API_ENDPOINTS.workoutUpdate(7));
      expect(save.request.params.get('language')).toBe('en');
      expect(save.request.body.name).toBe('English name');
      expect(save.request.body.description).toBe('English description');
      save.flush({success: false, message: 'Diagnostic only', data: null});
      if (scenario === 'roundtrip') {
        component.workout.name = 'English draft';
        (service.getWorkoutById as jasmine.Spy).and.returnValue(of({success: true, data: {workoutId: 7, workoutName: 'Magyar név'}}));
        language$.next('hu');
        expect(component.workout.name).toBe('Magyar piszkozat');
        expect(component.workout.description).toBe('Magyar leírás');
        component.saveWorkout();
        const hungarianSave = http.expectOne(req => req.method === 'PUT');
        expect(hungarianSave.request.params.get('language')).toBe('hu');
        expect(hungarianSave.request.body.name).toBe('Magyar piszkozat');
        hungarianSave.flush({success: false, data: null});
        (service.getWorkoutById as jasmine.Spy).and.returnValue(of({success: true, data: {workoutId: 7, workoutName: 'English name'}}));
        language$.next('en');
        expect(component.workout.name).toBe('English draft');
      }
      http.verify();
    });
  }
});
