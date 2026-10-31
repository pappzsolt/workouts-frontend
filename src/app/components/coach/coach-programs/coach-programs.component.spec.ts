import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { CoachProgramsComponent } from './coach-programs.component';
import { CoachWorkspaceService } from '../../../services/coach/coach-workspace.service';
import type { CoachProgram } from '../../../models/coach-workspace.model';

 describe('Coach program list filtering and pagination', () => {
  function create() {
    const workspace = {
      getCoachPrograms: jasmine.createSpy().and.returnValue(of([])),
      assignmentCounts: () => of({}),
      deleteProgram: jasmine.createSpy().and.returnValue(of(undefined)),
    };
    TestBed.configureTestingModule({providers: [{provide: CoachWorkspaceService, useValue: workspace}]});
    const component = TestBed.runInInjectionContext(() => new CoachProgramsComponent());
    const program = (id: number, name: string, start: string | null, end: string | null): CoachProgram => ({
      programId: id, programName: name, startDate: start, endDate: end,
      programDescription: null, durationDays: 28, difficultyLevel: null, workouts: [],
    });
    component.programs = [
      program(1, 'Beta', '2000-01-01', null),
      program(2, 'Alpha', '2000-01-01', '2000-01-02'),
      program(3, 'Gamma', '9999-01-01', null),
    ];
    return {component, workspace, program};
  }

  it('preserves status counts, search normalization and all sort directions', () => {
    const {component} = create();
    expect(component.countBy('active')).toBe(1);
    expect(component.countBy('finished')).toBe(1);
    expect(component.countBy('upcoming')).toBe(1);
    component.sort = 'nameAsc';
    expect(component.filtered.map(p => p.programId)).toEqual([2, 1, 3]);
    component.sort = 'nameDesc';
    expect(component.filtered.map(p => p.programId)).toEqual([3, 1, 2]);
    component.sort = 'dateAsc';
    expect(component.filtered.map(p => p.programId)).toEqual([1, 2, 3]);
    component.sort = 'dateDesc';
    expect(component.filtered.map(p => p.programId)).toEqual([3, 1, 2]);
    component.search = '  BETA  ';
    component.onSearchChange();
    expect(component.paged.map(p => p.programId)).toEqual([1]);
    expect(component.countBy('finished')).toBe(1);
    component.setFilter('finished');
    expect(component.paged).toEqual([]);
    expect(component.totalPages).toBe(1);
  });

  it('keeps page bounds and refreshes results after loading and deleting', () => {
    const {component, workspace, program} = create();
    const programs = Array.from({length: 13}, (_, i) => program(i + 1, `Program ${i}`, null, null));
    workspace.getCoachPrograms.and.returnValue(of(programs));
    component.load();
    expect(component.totalPages).toBe(2);
    component.goToPage(99);
    expect(component.page).toBe(2);
    expect(component.paged.length).toBe(1);
    component.askDelete(component.paged[0].programId);
    component.confirmDelete();
    expect(component.totalPages).toBe(1);
    expect(component.paged.length).toBe(12);
    expect(component.countBy('active')).toBe(12);
    component.search = 'No match';
    component.onSearchChange();
    expect(component.page).toBe(1);
    expect(component.paged).toEqual([]);
    expect(programs.length).toBe(13);
  });
});
