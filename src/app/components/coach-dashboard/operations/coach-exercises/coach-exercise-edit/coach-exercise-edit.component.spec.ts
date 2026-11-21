import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { BehaviorSubject, Subject } from 'rxjs';
import { CoachExerciseEditComponent } from './coach-exercise-edit.component';
import { ExerciseService } from '../../../../../services/coach/coach-exercises/coach-exercises.service';
import { LanguageCode, LanguageService } from '../../../../../services/shared/language.service';
import { LoggerService } from '../../../../../services/logger.service';
import type { Exercise } from '../../../../../models/exercise.model';
import type { ExerciseDto } from '../../../../../models/backend-dto/exercise/exercise-dto';
import type { ApiResponse } from '../../../../../models/backend-dto/common/api-response';

describe('Exercise editor language isolation', () => {
  let component: CoachExerciseEditComponent;
  let routeParams: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let language: BehaviorSubject<LanguageCode>;
  let loads: Subject<ApiResponse<Exercise[]>>[];
  let save: Subject<ApiResponse<ExerciseDto>>;
  let update: jasmine.Spy;
  const loaded = (request: number, name: string, id = 7) => loads[request].next({ success: true, data: [{ id, name }], message: null });
  beforeEach(() => {
    language = new BehaviorSubject<LanguageCode>('hu');
    routeParams = new BehaviorSubject(convertToParamMap({ id: '7' }));
    loads = [];
    save = new Subject<ApiResponse<ExerciseDto>>();
    update = jasmine.createSpy().and.returnValue(save);
    TestBed.configureTestingModule({ providers: [
      { provide: LoggerService, useValue: { error() {} } },
      { provide: ActivatedRoute, useValue: { paramMap: routeParams } },
    ] });
    component = TestBed.runInInjectionContext(() => new CoachExerciseEditComponent(
      TestBed.inject(ActivatedRoute),
      { navigate: jasmine.createSpy() } as never,
      { getAllExercises: () => { const request = new Subject<ApiResponse<Exercise[]>>(); loads.push(request); return request; }, updateExercise: update } as unknown as ExerciseService,
      { language$: language } as unknown as LanguageService,
    ));
    component.ngOnInit();
  });

  it('loads the new route ID and ignores the earlier route response', () => {
    routeParams.next(convertToParamMap({ id: '8' }));
    loaded(1, 'Bench', 8);
    loaded(0, 'Squat');
    component.saveExercise();
    expect(update).toHaveBeenCalledOnceWith(jasmine.objectContaining({ id: 8 }), 'hu');
  });

  it('blocks saving the old exercise while the new route is loading', () => {
    loaded(0, 'Squat');
    routeParams.next(convertToParamMap({ id: '8' }));
    component.saveExercise();
    expect(update).not.toHaveBeenCalled();
    language.next('de');
    loaded(2, 'Bankdrücken', 8);
    expect(component.exercise.name).toBe('Bankdrücken');
  });

  it('keeps the latest language despite an older response arriving last', () => {
    language.next('en');
    loaded(1, 'Squat');
    loaded(0, 'Guggolás');
    expect(component.exercise.name).toBe('Squat');
    component.saveExercise();
    expect(update).toHaveBeenCalledOnceWith(jasmine.objectContaining({ name: 'Squat' }), 'en');
  });

  it('prevents saving previous-language data while loading or after a failed load', () => {
    loaded(0, 'Guggolás');
    language.next('en');
    component.saveExercise();
    expect(update).not.toHaveBeenCalled();
    loads[1].error(new Error('offline'));
    component.saveExercise();
    expect(update).not.toHaveBeenCalled();
    expect(component.exerciseFound).toBeFalse();
    expect(component.loading).toBeFalse();
  });

  it('does not let a cancelled language error hide the current form', () => {
    language.next('en');
    loaded(1, 'Squat');
    loads[0].error(new Error('old failure'));
    expect(component.exerciseFound).toBeTrue();
    expect(component.messageType).not.toBe('error');
  });

  it('does not let an earlier save response replace the newly loaded language', () => {
    loaded(0, 'Guggolás');
    component.saveExercise();
    language.next('en');
    loaded(1, 'Squat');
    save.next({ success: true, data: { id: 7, name: 'Guggolás frissítve' } as ExerciseDto, message: 'Old success' });
    save.complete();
    expect(component.exercise.name).toBe('Squat');
    expect(component.message).not.toBe('Old success');
    expect(component.saving).toBeFalse();
  });

  it('ignores old save errors and prevents duplicate saves', () => {
    loaded(0, 'Guggolás');
    component.saveExercise();
    component.saveExercise();
    expect(update).toHaveBeenCalledTimes(1);
    language.next('en');
    loaded(1, 'Squat');
    save.error(new Error('old save failure'));
    expect(component.messageType).not.toBe('error');
    expect(component.saving).toBeFalse();
  });

  it('allows retrying a failed current-language load and then saving', () => {
    loads[0].error(new Error('offline'));
    language.next('hu');
    loaded(1, 'Guggolás');
    component.saveExercise();
    expect(update).toHaveBeenCalledOnceWith(jasmine.objectContaining({ name: 'Guggolás' }), 'hu');
  });
});
