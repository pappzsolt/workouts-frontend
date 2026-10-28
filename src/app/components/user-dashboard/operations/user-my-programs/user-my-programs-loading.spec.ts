import { HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Subject } from 'rxjs';
import { ApiResponse } from '../../../../models/backend-dto/common/api-response';
import { ProgramProgress, UserProgram } from '../../../../models/program.model';
import { UserMyProgramsComponent } from './user-my-programs.component';

const ok = <T>(data: T, message: string | null = null): ApiResponse<T> => ({ success: true, data, message });
const programs = [1, 2].map(id => ({ id, name: `Program ${id}`, description: null }) as UserProgram);
const progress: ProgramProgress[] = [{ programId: 1, completedWorkouts: 2, totalWorkouts: 3, progressPercent: 66 }];

describe('User programs loading contract', () => {
  let language: BehaviorSubject<string>;
  let component: UserMyProgramsComponent;
  let lists: Subject<ApiResponse<UserProgram[]>>[];
  let progresses: Subject<ApiResponse<ProgramProgress[]>>[];
  let getProgress: jasmine.Spy;

  beforeEach(() => {
    language = new BehaviorSubject('hu');
    lists = [];
    progresses = [];
    getProgress = jasmine.createSpy('getProgramProgress').and.callFake(() => {
      const request = new Subject<ApiResponse<ProgramProgress[]>>();
      progresses.push(request);
      return request;
    });
    component = new UserMyProgramsComponent({
      getPrograms: () => {
        const request = new Subject<ApiResponse<UserProgram[]>>();
        lists.push(request);
        return request;
      },
      getProgramProgress: getProgress,
    } as any, {} as any, { language$: language } as any, {} as any, {} as any);
    component.ngOnInit();
  });

  afterEach(() => component.ngOnDestroy());

  it('shows the list before progress finishes and requests progress for all programs', () => {
    expect(component.loading).toBeTrue();
    expect(component.message).toBe('userMyPrograms.loading');
    component.searchTerm = 'Program 2';
    lists[0].next(ok(programs, 'List message'));
    expect(component.loading).toBeFalse();
    expect(component.loadFailed).toBeFalse();
    expect(component.paginatedPrograms).toEqual([programs[1]]);
    expect(component.totalItems).toBe(1);
    expect(getProgress).toHaveBeenCalledOnceWith([1, 2]);
    expect(component.programProgress).toEqual({});
    progresses[0].next(ok(progress, 'Progress message'));
    expect(component.programProgress[1]).toEqual(progress[0]);
    expect(component.message).toBe('List message\nProgress message');
    expect(component.messageType).toBe('info');
  });

  it('keeps the original empty-list message and skips progress', () => {
    lists[0].next(ok([]));
    expect(component.message).toBe('userMyPrograms.noPrograms');
    expect(component.totalItems).toBe(0);
    expect(component.paginatedPrograms).toEqual([]);
    expect(component.currentPage).toBe(1);
    expect(getProgress).not.toHaveBeenCalled();
  });

  it('preserves the backend empty-list message', () => {
    lists[0].next(ok([], 'Nothing assigned'));
    expect(component.message).toBe('Nothing assigned');
  });

  it('does not load progress for an unsuccessful list response', () => {
    lists[0].next({ success: false, data: programs, message: 'List denied' });
    expect(component.loadFailed).toBeTrue();
    expect(component.loading).toBeFalse();
    expect(component.message).toBe('List denied');
    expect(component.messageType).toBe('error');
    expect(component.totalItems).toBe(0);
    expect(getProgress).not.toHaveBeenCalled();
  });

  it('clears failed list data and can reload after an HTTP error', () => {
    lists[0].error(new HttpErrorResponse({ status: 500, error: { message: 'List error' } }));
    expect(component.loadFailed).toBeTrue();
    expect(component.loading).toBeFalse();
    expect(component.message).toBe('List error');
    expect(component.programProgress).toEqual({});
    expect(component.paginatedPrograms).toEqual([]);
    language.next('en');
    expect(lists.length).toBe(2);
    expect(component.loadFailed).toBeFalse();
    lists[1].next(ok(programs));
    expect(component.totalItems).toBe(2);
  });

  for (const httpError of [false, true]) {
    it(`keeps the list on a progress ${httpError ? 'HTTP error' : 'failure response'} and allows retry`, () => {
      lists[0].next(ok(programs));
      if (httpError) progresses[0].error(new HttpErrorResponse({ status: 500, error: { message: 'Progress denied' } }));
      else progresses[0].next({ success: false, data: null, message: 'Progress denied' });
      expect(component.paginatedPrograms).toEqual([programs[0]]);
      expect(component.totalItems).toBe(2);
      expect(component.loadFailed).toBeFalse();
      expect(component.loading).toBeFalse();
      expect(component.message).toBe('Progress denied');
      expect(component.messageType).toBe('error');
      expect(component.programProgress).toEqual({});
      language.next('de');
      lists[1].next(ok(programs));
      progresses[1].next(ok(progress));
      expect(component.programProgress[1]).toEqual(progress[0]);
      expect(component.messageType).toBe('info');
    });
  }

  it('uses the original fallback messages when error bodies contain no message', () => {
    lists[0].error(new HttpErrorResponse({ status: 500 }));
    expect(component.message).toBe('userMyPrograms.loadError');
    language.next('en');
    lists[1].next(ok(programs));
    progresses[0].error(new HttpErrorResponse({ status: 500 }));
    expect(component.message).toBe('userMyPrograms.progressLoadError');
  });

  it('cancels an old list request on language change and ignores late results', () => {
    language.next('en');
    expect(lists[0].observed).toBeFalse();
    lists[0].next(ok(programs));
    expect(getProgress).not.toHaveBeenCalled();
    lists[1].next(ok([programs[1]]));
    expect(component.paginatedPrograms).toEqual([programs[1]]);
    expect(getProgress).toHaveBeenCalledOnceWith([2]);
  });

  it('cancels old progress, retains visible programs while reloading, and resets pagination on response', () => {
    lists[0].next(ok(programs));
    component.onPageChange(2);
    language.next('en');
    expect(progresses[0].observed).toBeFalse();
    expect(component.loading).toBeTrue();
    expect(component.paginatedPrograms).toEqual([programs[1]]);
    expect(component.currentPage).toBe(2);
    expect(component.programProgress).toEqual({});
    progresses[0].next(ok(progress));
    expect(component.programProgress).toEqual({});
    lists[1].next(ok(programs));
    expect(component.currentPage).toBe(1);
    expect(component.paginatedPrograms).toEqual([programs[0]]);
  });

  it('cancels the active list request on destroy', () => {
    component.ngOnDestroy();
    expect(lists[0].observed).toBeFalse();
    language.next('en');
    expect(lists.length).toBe(1);
  });

  it('cancels active progress on destroy', () => {
    lists[0].next(ok(programs));
    component.ngOnDestroy();
    expect(progresses[0].observed).toBeFalse();
  });
});
