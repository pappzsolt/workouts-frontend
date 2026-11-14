import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { BehaviorSubject, Subject, of } from 'rxjs';
import { LanguageService, type LanguageCode } from '../../../services/shared/language.service';
import { CoachWorkspaceService } from '../../../services/coach/coach-workspace.service';
import type { CoachProgram } from '../../../models/coach-workspace.model';
import { CoachProgramEditorComponent } from './coach-program-editor.component';

const program = (language: string): CoachProgram => ({
  programId: 1, programName: `${language} name`, programDescription: `${language} description`,
  durationDays: 14, difficultyLevel: 'BEGINNER', startDate: '2030-04-15', endDate: '2030-04-28', workouts: [],
});

describe('Coach program metadata language isolation', () => {
  let language: BehaviorSubject<LanguageCode>;
  let component: CoachProgramEditorComponent;
  let api: jasmine.SpyObj<CoachWorkspaceService>;
  beforeEach(() => {
    language = new BehaviorSubject<LanguageCode>('hu');
    api = jasmine.createSpyObj('workspace', ['getProgram', 'getProgramDays', 'getOverview', 'getAssignedUserIds', 'getMyWorkouts', 'updateProgram']);
    api.getProgram.and.callFake((_id, code) => of(program(code!)));
    api.getProgramDays.and.returnValue(of([]));
    api.getOverview.and.returnValue(of({ from: '', to: '', clients: [] }));
    api.getAssignedUserIds.and.returnValue(of([]));
    api.getMyWorkouts.and.returnValue(of([]));
    api.updateProgram.and.returnValue(of(undefined));
    TestBed.configureTestingModule({ providers: [
      { provide: LanguageService, useValue: { getCurrentLanguage: () => language.value, language$: language } },
      { provide: CoachWorkspaceService, useValue: api },
      { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: '1' })) } },
      { provide: Router, useValue: {} },
    ] });
    component = TestBed.runInInjectionContext(() => new CoachProgramEditorComponent());
    component.ngOnInit();
  });

  it('restores separate localized drafts while preserving shared metadata', () => {
    component.state.form.programName = 'HU draft';
    component.state.form.programDescription = 'HU description draft';
    component.state.form.durationDays = 21;
    language.next('en');
    expect(component.state.form.programName).toBe('en name');
    expect(component.state.form.programDescription).toBe('en description');
    expect(component.state.form.durationDays).toBe(21);
    component.state.form.programName = 'EN draft';
    language.next('hu');
    expect(component.state.form.programName).toBe('HU draft');
    expect(component.state.form.programDescription).toBe('HU description draft');
    language.next('en');
    expect(component.state.form.programName).toBe('EN draft');
    component.details.saveDetails();
    expect(api.updateProgram).toHaveBeenCalledWith(1, jasmine.objectContaining({ programName: 'EN draft' }), 'en');
  });

  it('blocks old-language saves while loading or after the new language fails', () => {
    const pending = new Subject<CoachProgram>();
    api.getProgram.and.returnValue(pending);
    language.next('en');
    component.details.saveDetails();
    expect(api.updateProgram).not.toHaveBeenCalled();
    pending.error(new Error('Unavailable'));
    expect(component.state.loading).toBeFalse();
    component.details.saveDetails();
    expect(api.updateProgram).not.toHaveBeenCalled();
    api.getProgram.and.returnValue(of(program('hu')));
    language.next('hu');
    component.details.saveDetails();
    expect(api.updateProgram).toHaveBeenCalledWith(1, jasmine.anything(), 'hu');
  });

  it('ignores a response for an abandoned language', () => {
    const english = new Subject<CoachProgram>();
    api.getProgram.and.callFake((_id, code) => code === 'en' ? english : of(program(code!)));
    language.next('en');
    language.next('de');
    english.next(program('en')); english.complete();
    expect(component.state.form.programName).toBe('de name');
    expect(component.state.detailsLanguage).toBe('de');
  });

  it('keeps a pending save bound to its submitted language after switching languages', () => {
    const saved = new Subject<void>();
    api.updateProgram.and.returnValue(saved);
    component.state.form.programName = 'Submitted HU';
    component.details.saveDetails();
    component.state.form.programName = 'New HU draft';
    language.next('en');
    saved.next(); saved.complete();
    expect(component.state.form.programName).toBe('en name');
    expect(api.updateProgram).toHaveBeenCalledWith(1, jasmine.objectContaining({ programName: 'Submitted HU' }), 'hu');
    expect(component.hasUnsavedChanges).toBeTrue();
    api.getProgram.and.callFake((_id, code) => of({ ...program(code!), programName: code === 'hu' ? 'Submitted HU' : `${code} name` }));
    language.next('hu');
    expect(component.state.form.programName).toBe('New HU draft');
  });

  it('protects unsaved text in a language that is not currently displayed', () => {
    component.state.form.programName = 'HU draft';
    language.next('en');
    expect(component.state.form.programName).toBe('en name');
    expect(component.hasUnsavedChanges).toBeTrue();
    expect(typeof component.canLeave()).not.toBe('boolean');
  });
  it('does not turn an empty optional description into a hidden-language draft', () => {
    api.getProgram.and.callFake((_id, code) => of({ ...program(code!), programDescription: null }));
    language.next('de');
    component.state.form.programDescription = '';
    language.next('en');
    expect(component.hasUnsavedChanges).toBeFalse();
  });

});
