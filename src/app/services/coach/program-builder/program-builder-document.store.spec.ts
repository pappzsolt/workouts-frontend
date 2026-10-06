import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import type { ApiResponse } from '../../../models/backend-dto/common/api-response';
import type { ProgramDto } from '../../../models/backend-dto/programs/program-dto';
import { CoachProgramService } from '../coach-program/coach-program.service';
import { LanguageService } from '../../shared/language.service';
import { ProgramBuilderDocumentStore } from './program-builder-document.store';

describe('ProgramBuilderDocumentStore', () => {
  let api: jasmine.SpyObj<CoachProgramService>;
  let store: ProgramBuilderDocumentStore;
  beforeEach(() => {
    api = jasmine.createSpyObj('CoachProgramService', ['getProgramById', 'createProgram', 'updateProgram']);
    TestBed.configureTestingModule({ providers: [ProgramBuilderDocumentStore,
      { provide: CoachProgramService, useValue: api },
      { provide: LanguageService, useValue: { getCurrentLanguage: () => 'hu' } },
    ] });
    store = TestBed.inject(ProgramBuilderDocumentStore);
  });

  it('cancels an older load so it cannot overwrite the newly opened program', () => {
    const older = new Subject<ApiResponse<ProgramDto>>();
    const newer = new Subject<ApiResponse<ProgramDto>>();
    api.getProgramById.and.returnValues(older, newer);
    const loaded = jasmine.createSpy('loaded'); const failed = jasmine.createSpy('failed');
    store.load(1, loaded, failed); store.load(2, loaded, failed);
    const program: ProgramDto = { programId: 2, programName: 'Newer', programDescription: '',
      durationDays: 7, startDate: '2035-03-15', endDate: '2035-03-21', difficultyLevel: 'BEGINNER', workouts: [] };
    newer.next({ success: true, data: program, message: null }); newer.complete();
    older.next({ success: true, data: { ...program, programId: 1, programName: 'Older' }, message: null });
    expect(store.form.programName).toBe('Newer');
    expect(loaded).toHaveBeenCalledTimes(1); expect(failed).not.toHaveBeenCalled(); expect(store.busy).toBeFalse();
  });

  it('preserves the existing ID on update and clears busy state after a failed save', () => {
    store.form.programName = 'Name'; store.form.startDate = '2035-03-15';
    store.form.durationDays = 7; store.form.difficultyLevel = 'BEGINNER';
    api.updateProgram.and.returnValue(of({ success: true, data: null, message: 'Program updated' }));
    let result: number | undefined;
    store.save(42).subscribe(id => { result = id; });
    expect(result).toBe(42);
    expect(store.message).toBe('Program updated');
    api.createProgram.and.returnValue(throwError(() => new Error('save failed')));
    const failed = jasmine.createSpy('failed');
    store.save(null).subscribe({ error: failed });
    expect(failed).toHaveBeenCalled(); expect(store.busy).toBeFalse();
  });
});
