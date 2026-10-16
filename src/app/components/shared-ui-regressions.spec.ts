import { EnvironmentInjector, Injector, createEnvironmentInjector, runInInjectionContext } from '@angular/core';
import { BehaviorSubject, Subject, of } from 'rxjs';
import { ExerciseControllerComponent } from './coach-dashboard/operations/coach-exercises/coach-exercises.component';
import { PaginationComponent } from './shared/components/pagination/pagination.component';
import { ExerciseService } from '../services/coach/coach-exercises/coach-exercises.service';
import { LanguageService } from '../services/shared/language.service';
import { LoggerService } from '../services/logger.service';

describe('Shared UI regressions', () => {
  let injector: EnvironmentInjector;
  let language: BehaviorSubject<string>;
  let catalog: jasmine.Spy;
  beforeEach(() => {
    language = new BehaviorSubject('hu');
    catalog = jasmine.createSpy().and.returnValue(of({ success: true, data: [] }));
    injector = createEnvironmentInjector([
      { provide: ExerciseService, useValue: { getAllExercises: catalog } },
      { provide: LanguageService, useValue: { language$: language } },
      { provide: LoggerService, useValue: { error() {} } },
    ], Injector.NULL as EnvironmentInjector);
  });
  afterEach(() => injector.destroy());
  const make = <T>(factory: () => T) => runInInjectionContext(injector, factory);
  const exercise = (id: number) => ({ id, name: `Exercise ${id}` } as any);

  it('accepts only the latest search response and preserves zero-based backend paging', () => {
    const first = new Subject<any>();
    const second = new Subject<any>();
    const search = jasmine.createSpy().and.returnValues(first, second);
    const page = make(() => new ExerciseControllerComponent({ searchExercises: search } as any, {} as any, {} as any, {} as any));
    page.searchTerm = 'old'; page.loadExercises();
    page.searchTerm = 'new'; page.search();
    expect(search.calls.mostRecent().args.slice(0, 4)).toEqual(['new', page.searchField, 0, page.itemsPerPage]);
    second.next({ success: true, data: { content: [exercise(2)], totalElements: 8, totalPages: 2 } });
    first.next({ success: true, data: { content: [exercise(1)], totalElements: 1 } });
    first.error(new Error('stale error'));
    expect(page.exercises.map(value => value.id)).toEqual([2]);
    expect(page.totalElements).toBe(8);
    expect(page.loading).toBeFalse();
    expect(page.messageType).not.toBe('error');
    page.ngOnDestroy();
  });

  it('cancels pending search on destruction', () => {
    const pending = new Subject<any>();
    const page = make(() => new ExerciseControllerComponent({ searchExercises: () => pending } as any, {} as any, {} as any, {} as any));
    page.loadExercises(); page.ngOnDestroy();
    pending.next({ success: true, data: { content: [exercise(1)] } });
    expect(page.exercises).toEqual([]);
  });

  it('emits valid one-based pages while honoring backend page count overrides', () => {
    const paginator = new PaginationComponent(); paginator.totalItems = 100; paginator.pageSize = 10;
    paginator.totalPagesOverride = 3; const events: number[] = []; paginator.pageChange.subscribe(value => events.push(value));
    paginator.goToPage(0); paginator.goToPage(1.5); paginator.goToPage(4); paginator.nextPage(); paginator.lastPage();
    expect(events).toEqual([2, 3]); expect(paginator.currentPage).toBe(1);
    paginator.currentPage = 3; expect(paginator.startItem).toBe(21); expect(paginator.endItem).toBe(30);
  });

  it('emits numeric sizes only, includes the current size, and reports empty counts', () => {
    const paginator = new PaginationComponent(); paginator.pageSize = 5; paginator.pageSizeOptions = [6, 6, 0, 12];
    const sizes: number[] = []; paginator.pageSizeChange.subscribe(value => sizes.push(value));
    for (const size of ['12', 'invalid', 0, 5, 1.5]) paginator.onPageSizeChange(size);
    expect(sizes).toEqual([12]); expect(paginator.sizeOptions.map(option => option.value)).toEqual([5, 6, 12]);
    expect(paginator.startItem).toBe(0); expect(paginator.endItem).toBe(0);
  });
});
