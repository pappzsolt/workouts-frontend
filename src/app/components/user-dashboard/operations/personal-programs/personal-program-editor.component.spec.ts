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
    component.state.model.name = 'Módosított';
    component.state.changed();
    api.save.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 409, error: { message: 'Már elindult' } })),
    );
    component.actions.save(form);
    expect(component.state.model.name).toBe('Módosított');
    expect(component.state.dirty).toBeTrue();
    expect(component.state.message).toBe('Már elindult');
    expect(component.state.busy).toBeFalse();
  });
  it('rejects duplicate workout days before replacing the draft', () => {
    component.state.model.workouts.push({ ...component.state.model.workouts[0], exercises: [] });
    component.actions.save(form);
    expect(api.save).not.toHaveBeenCalled();
    expect(component.state.message).toBe('personalPrograms.invalidDays');
  });
  it('requires saved nonempty days before confirming start and locks after start', () => {
    component.state.dirty = true;
    component.actions.ask('start');
    expect(component.state.action).toBeNull();
    component.state.dirty = false;
    component.actions.ask('start');
    expect(api.start).not.toHaveBeenCalled();
    component.actions.confirm();
    expect(api.start).toHaveBeenCalledOnceWith(9);
    expect(component.state.started).toBeTrue();
    component.actions.save(form);
    expect(api.save).not.toHaveBeenCalled();
    component.actions.ask('delete');
    expect(component.state.action).toBeNull();
  });
  it('builds an ISO business date even when the formatter uses month/day/year order', () => {
    const original = Intl.DateTimeFormat;
    spyOn(Intl, 'DateTimeFormat').and.callFake((function (_locales, options) {
      return new original('en-US', options);
    }) as typeof Intl.DateTimeFormat);
    jasmine.clock().install();
    try {
      // Budapest is already on the next day at this UTC instant.
      jasmine.clock().mockDate(new Date('2030-01-01T23:30:00Z'));
      expect(component.state.minimumStartDate).toBe('2030-01-02');
      component.state.model.startDate = '2030-01-01';
      expect(component.state.canStart).toBeFalse();
      component.state.model.startDate = '2030-01-02';
      expect(component.state.canStart).toBeTrue();
    } finally {
      jasmine.clock().uninstall();
    }
  });
  it('blocks starting a saved draft with a past date', () => {
    component.state.model.startDate = '2000-01-01';
    expect(component.state.canStart).toBeFalse();
    component.actions.ask('start');
    expect(component.state.action).toBeNull();
    expect(api.start).not.toHaveBeenCalled();
  });
  it('allows today, future and unspecified start dates', () => {
    for (const date of [component.state.minimumStartDate, '2099-01-01', null]) {
      component.state.model.startDate = date;
      expect(component.state.canStart).toBeTrue();
    }
  });
  it('checks the date again when confirming start', () => {
    component.actions.ask('start');
    component.state.model.startDate = '2000-01-01';
    component.actions.confirm();
    expect(api.start).not.toHaveBeenCalled();
    expect(component.state.action).toBeNull();
  });
  it('copies a saved program without starting its new copy', () => {
    component.actions.ask('copy');
    component.actions.confirm();
    expect(api.copy).toHaveBeenCalledOnceWith(9);
    expect(api.start).not.toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/user/personal-programs', 10]);
  });
  it('keeps unsaved edits after cancelling navigation', () => {
    component.state.dirty = true;
    const result = component.canLeave();
    expect(typeof result).not.toBe('boolean');
    if (typeof result !== 'boolean') result.subscribe((allowed) => expect(allowed).toBeFalse());
    component.navigation.cancel();
    expect(component.state.dirty).toBeTrue();
    expect(component.state.action).toBeNull();
  });
  it('blocks duplicate exercises and maintains their requested order', () => {
    component.days.pickerDay = component.state.model.workouts[0];
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
    component.days.addExercise(exercise);
    component.days.addExercise(exercise);
    expect(component.days.pickerDay.exercises.length).toBe(2);
    component.days.moveExercise(component.days.pickerDay, 1, -1);
    expect(component.days.pickerDay.exercises.map((e) => e.exerciseId)).toEqual([2, 1]);
  });
  it('takes the returned start date and latest revision from the server', () => {
    component.actions.ask('start');
    component.actions.confirm();
    expect(component.state.model.startDate).toBe('2026-10-25');
    expect(component.state.model.expectedVersion).toBe(2);
  });
  it('uses the newly returned version for the next save', () => {
    component.state.changed();
    component.actions.save(form);
    expect(component.state.model.expectedVersion).toBe(2);
    component.state.model.name = 'Második mentés';
    component.state.changed();
    component.actions.save(form);
    expect(api.save.calls.mostRecent().args[1].expectedVersion).toBe(2);
  });
  it('rejects too many prescribed sets before sending a save', () => {
    component.state.model.durationDays = 60;
    component.state.model.workouts = Array.from({ length: 51 }, (_, index) => ({
      dayIndex: index + 1,
      name: 'Nap',
      description: null,
      exercises: [{ exerciseId: 1, sets: 100, repetitions: 10, restSeconds: 60, notes: null }],
    }));
    component.actions.save(form);
    expect(api.save).not.toHaveBeenCalled();
    expect(component.state.message).toBe('personalPrograms.sizeLimit');
    expect(component.state.canStart).toBeFalse();
  });
  it('saves standalone mode as one day using the single visible workout name', () => {
    component.state.standaloneMode = true;
    component.state.model.durationDays = 1;
    component.state.model.name = 'Saját edzés';
    component.actions.save(form);
    const args = api.save.calls.mostRecent().args;
    expect(args[2]).toBeTrue();
    expect(args[1].durationDays).toBe(1);
    expect(args[1].workouts.length).toBe(1);
    expect(args[1].workouts[0].name).toBe('Saját edzés');
  });
  it('opens the new repeat as an unstarted editable workout', () => {
    component.state.standaloneMode = true;
    component.state.started = true;
    api.repeat.and.returnValue(
      of({
        id: 10,
        standalone: true,
        startedAt: null,
        program: { ...draft(), durationDays: 1, startDate: null },
      }),
    );
    component.actions.ask('repeat');
    expect(api.repeat).not.toHaveBeenCalled();
    component.actions.confirm();
    expect(api.repeat).toHaveBeenCalledOnceWith(9);
    expect(api.start).not.toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/user/personal-workouts', 10]);
  });
  it('cannot add or remove workout days in standalone mode', () => {
    component.state.standaloneMode = true;
    const day = component.state.model.workouts[0];
    component.days.addDay();
    component.days.removeDay(day);
    expect(component.state.model.workouts).toEqual([day]);
  });
  it('preserves the original workout and allows retry after a repeat error', () => {
    component.state.standaloneMode = true;
    component.state.started = true;
    const original = structuredClone(component.state.model);
    api.repeat.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({ status: 409, error: { message: 'Az ismétlés nem sikerült.' } }),
      ),
    );
    component.actions.ask('repeat');
    component.actions.confirm();
    expect(component.state.model).toEqual(original);
    expect(component.state.started).toBeTrue();
    expect(component.state.busy).toBeFalse();
    expect(component.state.action).toBeNull();
    expect(component.state.message).toBe('Az ismétlés nem sikerült.');
    expect(router.navigate).not.toHaveBeenCalled();
    component.actions.ask('repeat');
    expect(component.state.action).toBe('repeat');
  });
  it('sends only one repeat while a response is pending and blocks leaving', () => {
    component.state.standaloneMode = true;
    component.state.started = true;
    const pending = new Subject<PersonalProgramDetail>();
    api.repeat.and.returnValue(pending.asObservable());
    component.actions.ask('repeat');
    component.actions.confirm();
    component.actions.confirm();
    component.navigation.cancel();
    expect(api.repeat).toHaveBeenCalledTimes(1);
    expect(component.state.busy).toBeTrue();
    expect(component.canLeave()).toBeFalse();
    pending.next({
      id: 10,
      standalone: true,
      startedAt: null,
      program: { ...draft(), durationDays: 1, startDate: null },
    });
    pending.complete();
    expect(component.state.busy).toBeFalse();
    expect(router.navigate).toHaveBeenCalledTimes(1);
  });
  it('does not repeat normal programs or unstarted standalone drafts', () => {
    component.state.standaloneMode = false;
    component.state.started = true;
    component.actions.ask('repeat');
    expect(component.state.action).toBeNull();
    component.state.standaloneMode = true;
    component.state.started = false;
    component.actions.ask('repeat');
    expect(component.state.action).toBeNull();
    expect(api.repeat).not.toHaveBeenCalled();
  });
  it('saves the persisted standalone version as a template and blocks duplicate requests', () => {
    component.state.standaloneMode = true;
    const pending = new Subject<any>();
    api.saveTemplate.and.returnValue(pending);
    component.actions.saveTemplate();
    component.actions.saveTemplate();
    expect(api.saveTemplate).toHaveBeenCalledOnceWith(9, 1);
    expect(component.state.busy).toBeTrue();
    pending.next({ id: 12 });
    pending.complete();
    expect(component.state.busy).toBeFalse();
    expect(component.state.message).toBe('workoutTemplates.saved');
    expect(component.state.model.expectedVersion).toBe(1);
  });

  it('does not save an unsaved or normal program as a workout template', () => {
    component.actions.saveTemplate();
    component.state.standaloneMode = true;
    component.state.dirty = true;
    component.actions.saveTemplate();
    component.state.dirty = false;
    component.state.id = null;
    component.actions.saveTemplate();
    expect(api.saveTemplate).not.toHaveBeenCalled();
  });

  it('initializes the standalone route with exactly one hidden workout day', () => {
    const route = TestBed.inject(ActivatedRoute);
    Object.defineProperty(route, 'snapshot', {
      configurable: true,
      value: { data: { standalone: true } },
    });
    const fresh = TestBed.runInInjectionContext(() => new PersonalProgramEditorComponent());
    expect(fresh.state.standaloneMode).toBeTrue();
    expect(fresh.state.model.durationDays).toBe(1);
    expect(fresh.state.model.workouts.length).toBe(1);
    expect(fresh.state.model.workouts[0].dayIndex).toBe(1);
  });
});
