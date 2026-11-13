import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { CoachWorkspaceService } from '../../../services/coach/coach-workspace.service';
import { ExercisePickerComponent } from './exercise-picker.component';

describe('Exercise picker request timing', () => {
  it('debounces typing but handles filters immediately and cancels superseded searches', fakeAsync(() => {
    const browse = jasmine.createSpy('browseExercises').and.returnValue(of({ items: [], totalElements: 0, totalPages: 1 }));
    TestBed.configureTestingModule({
      imports: [ExercisePickerComponent],
      providers: [provideTranslateService(), { provide: CoachWorkspaceService, useValue: {
        browseExercises: browse,
        getExerciseFilterOptions: () => of({ bodyParts: [], equipment: [] }),
      } }],
    });
    const fixture = TestBed.createComponent(ExercisePickerComponent);
    fixture.detectChanges();
    expect(browse).toHaveBeenCalledTimes(1);
    fixture.componentInstance.onSearch('s');
    tick(200);
    fixture.componentInstance.onSearch('squ');
    tick(299);
    expect(browse).toHaveBeenCalledTimes(1);
    tick(1);
    expect(browse).toHaveBeenCalledTimes(2);
    expect(browse.calls.mostRecent().args[0].search).toBe('squ');
    fixture.componentInstance.onFilterChange();
    expect(browse).toHaveBeenCalledTimes(3);
  }));
});
