import { TestBed } from '@angular/core/testing';
import { BehaviorSubject, of } from 'rxjs';
import { UserExerciseLibraryComponent } from './user-exercise-library.component';
import { UserExerciseCatalogueService } from '../../../../services/user/user-exercise-catalogue.service';
import { LanguageService } from '../../../../services/shared/language.service';
import { TranslateService } from '@ngx-translate/core';
import { LoggerService } from '../../../../services/logger.service';
import type { ApiResponse } from '../../../../models/backend-dto/common/api-response';
import type { PageResponse } from '../../../../models/backend-dto/common/page-response';
import type { Exercise } from '../../../../models/exercise.model';

const list: PageResponse<Exercise> = {
  content: [{ id: 12, name: 'Guggolás', description: 'Leírás', instructions: 'Kivitelezés' }],
  page: 0, size: 6, totalElements: 1, totalPages: 1,
};
const ok = <T>(data: T): ApiResponse<T> => ({ success: true, data, message: null });

describe('User exercise library', () => {
  let component: UserExerciseLibraryComponent;
  let search: jasmine.Spy;
  const language$ = new BehaviorSubject<'hu' | 'en' | 'de'>('hu');

  beforeEach(() => {
    language$.next('hu');
    search = jasmine.createSpy('search').and.returnValue(of(ok(list)));
    TestBed.configureTestingModule({
      providers: [
        { provide: UserExerciseCatalogueService, useValue: {
          search, filters: () => of(ok({ bodyParts: ['chest'], equipment: ['barbell'] })),
        } },
        { provide: LanguageService, useValue: { language$ } },
        { provide: TranslateService, useValue: { instant: (key: string) => key } },
        { provide: LoggerService, useValue: { error: jasmine.createSpy('error') } },
      ],
    });
    component = TestBed.runInInjectionContext(() => new UserExerciseLibraryComponent());
    component.ngOnInit();
  });

  it('loads the shared catalogue using only read methods', () => {
    expect(search).toHaveBeenCalledOnceWith('', 'all', 0, 6, 'asc', '', '');
    expect(component.exercises.map((exercise) => exercise.name)).toEqual(['Guggolás']);
    expect(component.totalElements).toBe(1);
    component.toggleDetails(12);
    expect(component.expandedExerciseId).toBe(12);
    component.toggleDetails(12);
    expect(component.expandedExerciseId).toBeNull();
  });

  it('keeps unsubmitted text out of filter requests, then searches and clears', () => {
    component.onSearchTermChange('gugg');
    component.bodyPartFilter = 'chest';
    component.onFilterChange();
    expect(search.calls.mostRecent().args[0]).toBe('');
    expect(search.calls.mostRecent().args[5]).toBe('chest');
    component.search();
    expect(search.calls.mostRecent().args[0]).toBe('gugg');
    component.onSearchTermChange('');
    expect(search.calls.mostRecent().args[0]).toBe('');
  });

  it('sorts, changes page and refreshes translated labels without write requests', () => {
    search.and.returnValue(of(ok({ ...list, totalElements: 15, totalPages: 3 })));
    component.toggleSort();
    expect(search.calls.mostRecent().args[4]).toBe('desc');
    component.onPageChange(2);
    expect(search.calls.mostRecent().args[2]).toBe(1);
    language$.next('en');
    expect(search.calls.mostRecent().args[2]).toBe(0);
    expect(component.currentPage).toBe(0);
  });
});
