import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { ExerciseControllerComponent } from './coach-exercises.component';
import { ExerciseService } from '../../../../services/coach/coach-exercises/coach-exercises.service';
import { CoachWorkspaceService } from '../../../../services/coach/coach-workspace.service';
import { LanguageService } from '../../../../services/shared/language.service';
import { LoggerService } from '../../../../services/logger.service';
import { TranslateService } from '@ngx-translate/core';

describe('Coach exercise catalogue search', () => {
  let component: ExerciseControllerComponent;
  let searchExercises: jasmine.Spy;
  let filterOptions: jasmine.Spy;
  const languageChanges = new Subject<string>();

  beforeEach(() => {
    searchExercises = jasmine.createSpy('searchExercises').and.returnValue(
      of({ success: true, data: { content: [], totalElements: 0, totalPages: 1 }, message: null }),
    );
    filterOptions = jasmine.createSpy('getExerciseFilterOptions').and.returnValue(
      of({ bodyParts: ['chest'], equipment: ['barbell'] }),
    );
    TestBed.configureTestingModule({
      providers: [
        { provide: CoachWorkspaceService, useValue: { getExerciseFilterOptions: filterOptions } },
        { provide: LoggerService, useValue: { error: jasmine.createSpy('error') } },
        { provide: TranslateService, useValue: { instant: (key: string) => key === 'coachWorkspace.bodyPart.chest' ? 'Mellkas' : key } },
      ],
    });
    component = TestBed.runInInjectionContext(() => new ExerciseControllerComponent(
      { searchExercises } as unknown as ExerciseService,
      { navigate: jasmine.createSpy('navigate') } as unknown as Router,
      { snapshot: { queryParamMap: convertToParamMap({}) } } as ActivatedRoute,
      { language$: languageChanges } as unknown as LanguageService,
    ));
    component.ngOnInit();
  });

  afterEach(() => component.ngOnDestroy());

  it('keeps an unsubmitted draft out of filter and sort requests', () => {
    expect(searchExercises.calls.count()).toBe(1);
    component.onSearchTermChange('guggolás');
    expect(searchExercises.calls.count()).toBe(1);
    component.bodyPartFilter = 'chest';
    component.onFilterChange();
    expect(searchExercises.calls.mostRecent().args[0]).toBe('');
    expect(searchExercises.calls.mostRecent().args[7]).toBe('chest');
    component.search();
    expect(searchExercises.calls.mostRecent().args[0]).toBe('guggolás');
    component.toggleSort();
    expect(searchExercises.calls.mostRecent().args[0]).toBe('guggolás');
  });

  it('submits a term on Search/Enter and refreshes results when cleared', () => {
    component.onSearchTermChange('  fekvenyomás  ');
    component.search();
    expect(searchExercises.calls.mostRecent().args[0]).toBe('fekvenyomás');
    expect(component.hasActiveSearch).toBeTrue();
    component.onSearchTermChange('');
    expect(searchExercises.calls.mostRecent().args[0]).toBe('');
    expect(component.hasActiveSearch).toBeFalse();
    expect(searchExercises.calls.count()).toBe(3);
  });

  it('applies search-field changes, starts on page zero and tracks active filters', () => {
    component.search();
    component.currentPage = 2;
    component.onSearchFieldChange('primaryMuscles');
    expect(component.currentPage).toBe(0);
    expect(searchExercises.calls.mostRecent().args[1]).toBe('primaryMuscles');
    component.equipmentFilter = 'barbell';
    component.onFilterChange();
    expect(component.hasActiveSearch).toBeTrue();
    expect(searchExercises.calls.mostRecent().args[8]).toBe('barbell');
  });

  it('resolves the translated body part label to its canonical code', () => {
    component.onSearchFieldChange('bodyPart');
    component.onSearchTermChange('mellkas');
    component.search();
    expect(searchExercises.calls.mostRecent().args[0]).toBe('chest');
    component.onSearchTermChange('mell');
    component.search();
    expect(searchExercises.calls.mostRecent().args[0]).toBe('chest');
  });

  it('keeps filter loading errors visible separately from exercise results', () => {
    component.ngOnDestroy();
    filterOptions.and.returnValue(throwError(() => new Error('offline')));
    component = TestBed.runInInjectionContext(() => new ExerciseControllerComponent(
      { searchExercises } as unknown as ExerciseService,
      { navigate: jasmine.createSpy() } as unknown as Router,
      { snapshot: { queryParamMap: convertToParamMap({}) } } as ActivatedRoute,
      { language$: languageChanges } as unknown as LanguageService,
    ));
    component.ngOnInit();
    expect(component.filterOptionsError).toBe('coachExercises.filterLoadError');
    component.search();
    expect(component.filterOptionsError).toBe('coachExercises.filterLoadError');
  });
});
