import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { BehaviorSubject, Subject, of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { NgForm } from '@angular/forms';
import { PersonalProgramEditorComponent } from './personal-program-editor.component';
import { PersonalProgramService } from '../../../../services/user/personal-program.service';
import { ExerciseService } from '../../../../services/coach/coach-exercises/coach-exercises.service';
import { LanguageService } from '../../../../services/shared/language.service';
import {
  PersonalProgramDetail,
  PersonalProgramRequest,
} from '../../../../models/personal-program.model';

const draft = (): PersonalProgramRequest => ({
  name: 'Saját',
  description: null,
  durationDays: 7,
  startDate: null,
  difficultyLevel: null,
  languageCode: 'hu',
  expectedVersion: 1,
  workouts: [
    {
      dayIndex: 1,
      name: 'Nap',
      description: null,
      exercises: [{ exerciseId: 1, sets: 3, repetitions: 10, restSeconds: 60, notes: null }],
    },
  ],
});

describe('PersonalProgramEditorComponent', () => {
  let component: PersonalProgramEditorComponent;
  let api: jasmine.SpyObj<PersonalProgramService>;
  let router: jasmine.SpyObj<Router>;
  const form = {
    invalid: false,
    control: { markAllAsTouched: () => undefined },
  } as unknown as NgForm;
  beforeEach(() => {
    api = jasmine.createSpyObj('PersonalProgramService', [
      'get',
      'save',
      'start',
      'copy',
      'repeat',
      'saveTemplate',
      'delete',
    ]);
    api.get.and.returnValue(of({ id: 9, startedAt: null, program: draft() }));
    api.save.and.returnValue(
      of({ id: 9, startedAt: null, program: { ...draft(), expectedVersion: 2 } }),
    );
    api.start.and.returnValue(
      of({
        id: 9,
        startedAt: '2026-10-25T12:00:00',
        program: { ...draft(), startDate: '2026-10-25', expectedVersion: 2 },
      }),
    );
    api.copy.and.returnValue(of(10));
    router = jasmine.createSpyObj('Router', ['navigate']);
    router.navigate.and.resolveTo(true);
    TestBed.configureTestingModule({
      providers: [
        provideTranslateService(),
        { provide: PersonalProgramService, useValue: api },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: '9' })) } },
        {
          provide: ExerciseService,
          useValue: {
            getAllExercises: () => of({ success: true, data: [{ id: 1, name: 'Gyakorlat' }] }),
          },
        },
        {
          provide: LanguageService,
          useValue: { language$: new BehaviorSubject('hu'), getCurrentLanguage: () => 'hu' },
        },
      ],
    });
    component = TestBed.runInInjectionContext(() => new PersonalProgramEditorComponent());
    component.ngOnInit();
  });
  it('preserves edits and shows backend error after failed save', () => {
    component.model.name = 'Módosított';
    component.changed();
    api.save.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 409, error: { message: 'Már elindult' } })),
    );
    component.save(form);
    expect(component.model.name).toBe('Módosított');
    expect(component.dirty).toBeTrue();
    expect(component.message).toBe('Már elindult');
    expect(component.busy).toBeFalse();
  });
  it('rejects duplicate workout days before replacing the draft', () => {
    component.model.workouts.push({ ...component.model.workouts[0], exercises: [] });
    component.save(form);
    expect(api.save).not.toHaveBeenCalled();
    expect(component.message).toBe('personalPrograms.invalidDays');
  });
  it('requires saved nonempty days before confirming start and locks after start', () => {
    component.dirty = true;
    component.ask('start');
    expect(component.action).toBeNull();
    component.dirty = false;
    component.ask('start');
    expect(api.start).not.toHaveBeenCalled();
    component.confirm();
    expect(api.start).toHaveBeenCalledOnceWith(9);
    expect(component.started).toBeTrue();
    component.save(form);
    expect(api.save).not.toHaveBeenCalled();
    component.ask('delete');
    expect(component.action).toBeNull();
  });
  it('blocks starting a saved draft with a past date', () => {
    component.model.startDate = '2000-01-01';
    expect(component.canStart).toBeFalse();
    component.ask('start');
    expect(component.action).toBeNull();
    expect(api.start).not.toHaveBeenCalled();
  });
  it('allows today, future and unspecified start dates', () => {
    for (const date of [component.minimumStartDate, '2099-01-01', null]) {
      component.model.startDate = date;
      expect(component.canStart).toBeTrue();
    }
  });
  it('checks the date again when confirming start', () => {
    component.ask('start');
    component.model.startDate = '2000-01-01';
    component.confirm();
    expect(api.start).not.toHaveBeenCalled();
    expect(component.action).toBeNull();
  });
  it('copies a saved program without starting its new copy', () => {
    component.ask('copy');
    component.confirm();
    expect(api.copy).toHaveBeenCalledOnceWith(9);
    expect(api.start).not.toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/user/personal-programs', 10]);
  });
  it('keeps unsaved edits after cancelling navigation', () => {
    component.dirty = true;
    const result = component.canLeave();
    expect(typeof result).not.toBe('boolean');
    if (typeof result !== 'boolean') result.subscribe((allowed) => expect(allowed).toBeFalse());
    component.cancel();
    expect(component.dirty).toBeTrue();
    expect(component.action).toBeNull();
  });
  it('blocks duplicate exercises and maintains their requested order', () => {
    component.pickerDay = component.model.workouts[0];
    const exercise = {
      id: 2,
      name: 'Második',
      muscleGroup: null,
      equipment: null,
      bodyPart: null,
      primaryMuscles: null,
      description: null,
      imageUrl: null,
    };
    component.addExercise(exercise);
    component.addExercise(exercise);
    expect(component.pickerDay.exercises.length).toBe(2);
    component.moveExercise(component.pickerDay, 1, -1);
    expect(component.pickerDay.exercises.map((e) => e.exerciseId)).toEqual([2, 1]);
  });
  it('takes the returned start date and latest revision from the server', () => {
    component.ask('start');
    component.confirm();
    expect(component.model.startDate).toBe('2026-10-25');
    expect(component.model.expectedVersion).toBe(2);
  });
  it('uses the newly returned version for the next save', () => {
    component.changed();
    component.save(form);
    expect(component.model.expectedVersion).toBe(2);
    component.model.name = 'Második mentés';
    component.changed();
    component.save(form);
    expect(api.save.calls.mostRecent().args[1].expectedVersion).toBe(2);
  });
  it('rejects too many prescribed sets before sending a save', () => {
    component.model.durationDays = 60;
    component.model.workouts = Array.from({ length: 51 }, (_, index) => ({
      dayIndex: index + 1,
      name: 'Nap',
      description: null,
      exercises: [{ exerciseId: 1, sets: 100, repetitions: 10, restSeconds: 60, notes: null }],
    }));
    component.save(form);
    expect(api.save).not.toHaveBeenCalled();
    expect(component.message).toBe('personalPrograms.sizeLimit');
    expect(component.canStart).toBeFalse();
  });
  it('saves standalone mode as one day using the single visible workout name', () => {
    component.standaloneMode = true;
    component.model.durationDays = 1;
    component.model.name = 'Saját edzés';
    component.save(form);
    const args = api.save.calls.mostRecent().args;
    expect(args[2]).toBeTrue();
    expect(args[1].durationDays).toBe(1);
    expect(args[1].workouts.length).toBe(1);
    expect(args[1].workouts[0].name).toBe('Saját edzés');
  });
  it('opens the new repeat as an unstarted editable workout', () => {
    component.standaloneMode = true;
    component.started = true;
    api.repeat.and.returnValue(
      of({
        id: 10,
        standalone: true,
        startedAt: null,
        program: { ...draft(), durationDays: 1, startDate: null },
      }),
    );
    component.ask('repeat');
    expect(api.repeat).not.toHaveBeenCalled();
    component.confirm();
    expect(api.repeat).toHaveBeenCalledOnceWith(9);
    expect(api.start).not.toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/user/personal-workouts', 10]);
  });
  it('cannot add or remove workout days in standalone mode', () => {
    component.standaloneMode = true;
    const day = component.model.workouts[0];
    component.addDay();
    component.removeDay(day);
    expect(component.model.workouts).toEqual([day]);
  });
  it('preserves the original workout and allows retry after a repeat error', () => {
    component.standaloneMode = true;
    component.started = true;
    const original = structuredClone(component.model);
    api.repeat.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({ status: 409, error: { message: 'Az ismétlés nem sikerült.' } }),
      ),
    );
    component.ask('repeat');
    component.confirm();
    expect(component.model).toEqual(original);
    expect(component.started).toBeTrue();
    expect(component.busy).toBeFalse();
    expect(component.action).toBeNull();
    expect(component.message).toBe('Az ismétlés nem sikerült.');
    expect(router.navigate).not.toHaveBeenCalled();
    component.ask('repeat');
    expect(component.action).toBe('repeat');
  });
  it('sends only one repeat while a response is pending and blocks leaving', () => {
    component.standaloneMode = true;
    component.started = true;
    const pending = new Subject<PersonalProgramDetail>();
    api.repeat.and.returnValue(pending.asObservable());
    component.ask('repeat');
    component.confirm();
    component.confirm();
    component.cancel();
    expect(api.repeat).toHaveBeenCalledTimes(1);
    expect(component.busy).toBeTrue();
    expect(component.canLeave()).toBeFalse();
    pending.next({
      id: 10,
      standalone: true,
      startedAt: null,
      program: { ...draft(), durationDays: 1, startDate: null },
    });
    pending.complete();
    expect(component.busy).toBeFalse();
    expect(router.navigate).toHaveBeenCalledTimes(1);
  });
  it('does not repeat normal programs or unstarted standalone drafts', () => {
    component.standaloneMode = false;
    component.started = true;
    component.ask('repeat');
    expect(component.action).toBeNull();
    component.standaloneMode = true;
    component.started = false;
    component.ask('repeat');
    expect(component.action).toBeNull();
    expect(api.repeat).not.toHaveBeenCalled();
  });
  it('saves the persisted standalone version as a template and blocks duplicate requests', () => {
    component.standaloneMode = true;
    const pending = new Subject<any>();
    api.saveTemplate.and.returnValue(pending);
    component.saveTemplate();
    component.saveTemplate();
    expect(api.saveTemplate).toHaveBeenCalledOnceWith(9, 1);
    expect(component.busy).toBeTrue();
    pending.next({ id: 12 });
    pending.complete();
    expect(component.busy).toBeFalse();
    expect(component.message).toBe('workoutTemplates.saved');
    expect(component.model.expectedVersion).toBe(1);
  });

  it('does not save an unsaved or normal program as a workout template', () => {
    component.saveTemplate();
    component.standaloneMode = true;
    component.dirty = true;
    component.saveTemplate();
    component.dirty = false;
    component.id = null;
    component.saveTemplate();
    expect(api.saveTemplate).not.toHaveBeenCalled();
  });

  it('initializes the standalone route with exactly one hidden workout day', () => {
    const route = TestBed.inject(ActivatedRoute);
    Object.defineProperty(route, 'snapshot', {
      configurable: true,
      value: { data: { standalone: true } },
    });
    const fresh = TestBed.runInInjectionContext(() => new PersonalProgramEditorComponent());
    expect(fresh.standaloneMode).toBeTrue();
    expect(fresh.model.durationDays).toBe(1);
    expect(fresh.model.workouts.length).toBe(1);
    expect(fresh.model.workouts[0].dayIndex).toBe(1);
  });
});
