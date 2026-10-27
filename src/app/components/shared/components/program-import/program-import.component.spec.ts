import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of, Subject, throwError } from 'rxjs';
import { ProgramImportComponent } from './program-import.component';
import { ProgramImportService, ImportRequest, ImportResult } from '../../../../services/shared/program-import.service';
import { CoachWorkspaceService } from '../../../../services/coach/coach-workspace.service';
import { LanguageService } from '../../../../services/shared/language.service';

const result = (): ImportResult => ({ programId: null, programName: 'Terv', startDate: '2026-11-02', endDate: '2026-12-06', workouts: 20, exercises: 100, sets: 215, warnings: [], unresolvedExercises: [] });
describe('ProgramImportComponent', () => {
  let component: ProgramImportComponent;
  let service: jasmine.SpyObj<ProgramImportService>;
  function create(scope = 'personal') {
    service = jasmine.createSpyObj('ProgramImportService', ['preview', 'import']);
    service.preview.and.returnValue(of(result())); service.import.and.returnValue(of({ ...result(), programId: 9 }));
    TestBed.configureTestingModule({ providers: [
      { provide: ProgramImportService, useValue: service },
      { provide: CoachWorkspaceService, useValue: { getOverview: () => of({ clients: [{ userId: 42, username: 'Anna' }] }) } },
      { provide: LanguageService, useValue: { getCurrentLanguage: () => 'hu' } },
      { provide: ActivatedRoute, useValue: { snapshot: { data: { importScope: scope }, queryParamMap: convertToParamMap({ userId: '42' }) } } },
    ] });
    component = TestBed.runInInjectionContext(() => new ProgramImportComponent());
    component.ngOnInit(); component.file = new File(['xlsx'], 'terv.xlsx');
  }
  it('requires preview, invalidates it on edits and prevents duplicate saves after success', () => {
    create(); component.save(); expect(service.import).not.toHaveBeenCalled();
    component.check(); expect(component.canImport).toBeTrue();
    component.programName = 'Másik'; component.changed();
    component.save(); expect(service.import).not.toHaveBeenCalled();
    component.check(); component.save(); component.save();
    expect(service.import).toHaveBeenCalledTimes(1); expect(component.result?.programId).toBe(9);
    const request = service.import.calls.mostRecent().args[1];
    expect(request.userId).toBeNull(); expect(request.programName).toBe('Másik');
  });
  it('preselects an owned coach client and includes that ID in the request', () => {
    create('coach'); expect(component.userId).toBe(42);
    component.check(); expect(service.preview.calls.mostRecent().args[1].userId).toBe(42);
    component.userId = 999; component.changed(); component.check(); expect(service.preview).toHaveBeenCalledTimes(1);
  });
  it('blocks unresolved exercises and requires a fresh preview after choosing a match', () => {
    create(); service.preview.and.returnValue(of({ ...result(), unresolvedExercises: [{ name: 'Guggolás', candidateIds: [11, 12] }] }));
    component.check(); expect(component.canImport).toBeFalse();
    component.activeMapping = 'Guggolás';
    component.pickExercise({ id: 11, name: 'Guggolás', description: null, bodyPart: null, equipment: null, muscleGroup: null, primaryMuscles: null, imageUrl: null });
    expect(component.preview).toBeNull(); expect(component.mappings['Guggolás'].id).toBe(11);
    service.preview.and.returnValue(of(result())); component.check();
    expect(service.preview.calls.mostRecent().args[1].exerciseMappings).toEqual({ 'Guggolás': 11 });
    expect(component.canImport).toBeTrue();
  });
  it('locks the form during save and shows an uncertain response without automatic retry', () => {
    create(); const pending = new Subject<ImportResult>(); service.import.and.returnValue(pending);
    component.check(); component.save(); component.save();
    expect(component.canLeave()).toBeFalse(); expect(service.import).toHaveBeenCalledTimes(1);
    pending.error(new HttpErrorResponse({ status: 0 }));
    expect(component.uncertain).toBeTrue(); expect(component.canImport).toBeFalse(); expect(component.canLeave()).toBeTrue();
    expect(component.file?.name).toBe('terv.xlsx');
  });
  it('rejects invalid files and resets a previous preview', () => {
    create(); component.check();
    const input = { files: [new File(['data'], 'bad.csv')], value: 'bad.csv' };
    component.selectFile({ target: input } as unknown as Event);
    expect(component.file).toBeNull(); expect(component.preview).toBeNull(); expect(input.value).toBe('');
  });
});
