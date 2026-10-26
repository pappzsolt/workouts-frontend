import { TestBed } from '@angular/core/testing';
import { BehaviorSubject, of } from 'rxjs';
import { PersonalProgramsComponent } from './personal-programs.component';
import { PersonalProgramService } from '../../../../services/user/personal-program.service';
import { LanguageService } from '../../../../services/shared/language.service';

describe('PersonalProgramsComponent pagination', () => {
  let component: PersonalProgramsComponent;
  let api: jasmine.SpyObj<PersonalProgramService>;
  beforeEach(() => {
    api = jasmine.createSpyObj('PersonalProgramService', ['listPage']);
    api.listPage.and.returnValue(of({ content: [], page: 0, size: 12, totalElements: 30, totalPages: 3 }));
    TestBed.configureTestingModule({ providers: [
      { provide: PersonalProgramService, useValue: api },
      { provide: LanguageService, useValue: { language$: new BehaviorSubject('hu') } },
    ] });
    component = TestBed.runInInjectionContext(() => new PersonalProgramsComponent());
    component.ngOnInit();
  });
  it('loads one bounded page and uses server totals', () => {
    expect(api.listPage).toHaveBeenCalledOnceWith(0, 12, null, '');
    expect(component.totalItems).toBe(30);
  });
  it('converts pagination controls to zero-based API pages', () => {
    component.changePage(3);
    expect(api.listPage).toHaveBeenCalledWith(2, 12, null, '');
  });
  it('resets the page and sends type and search filters to the server', () => {
    component.changePage(3);
    component.kind = 'standalone';
    component.search = '%_';
    component.filtersChanged();
    expect(component.page).toBe(0);
    expect(api.listPage).toHaveBeenCalledWith(0, 12, true, '%_');
    component.kind = 'program';
    component.filtersChanged();
    expect(api.listPage).toHaveBeenCalledWith(0, 12, false, '%_');
  });
});
