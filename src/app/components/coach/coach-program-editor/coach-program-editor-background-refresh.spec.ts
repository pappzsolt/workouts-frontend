import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { Observable, of, Subject } from 'rxjs';
import { CoachWorkspaceService } from '../../../services/coach/coach-workspace.service';
import type { CoachProgram, CoachClientOverview } from '../../../models/coach-workspace.model';
import { CoachProgramEditorComponent } from './coach-program-editor.component';

const program: CoachProgram = {
  programId: 10, programName: 'Strength', programDescription: 'Original', durationDays: 28,
  difficultyLevel: 'BEGINNER', startDate: '2026-10-23', endDate: null, workouts: [],
};
const athlete = (id: number): CoachClientOverview => ({
  userId: id, username: `Athlete ${id}`, email: `${id}@example.com`, age: null,
  weight: null, height: null, gender: null, goals: null, lastCompletedAt: null,
  programs: [], workouts: [],
});

describe('Coach program background refresh and assignment consistency', () => {
  let component: CoachProgramEditorComponent;
  let assigned: number[];
  let assignProgram: jasmine.Spy;

  beforeEach(() => {
    assigned = [];
    assignProgram = jasmine.createSpy('assignProgram');
    TestBed.configureTestingModule({ providers: [
      { provide: CoachWorkspaceService, useValue: {
        getProgram: () => of(program), getProgramDays: () => of([]),
        getOverview: () => of({ clients: [athlete(7), athlete(8)] }),
        getAssignedUserIds: () => of(assigned),
        getMyWorkouts: () => of([]), assignProgram,
      } },
      { provide: ActivatedRoute, useValue: {
        paramMap: of(convertToParamMap({ id: '10' })),
        snapshot: { queryParamMap: convertToParamMap({}) },
      } },
      { provide: Router, useValue: {} },
    ] });
    component = TestBed.runInInjectionContext(() => new CoachProgramEditorComponent());
    component.ngOnInit();
  });

  it('preserves individually edited metadata and selected athletes after a day save', () => {
    component.state.form.programName = 'Unsaved title';
    component.state.form.programDescription = 'Unsaved notes';
    component.assignments.toggleAssign(7, true);
    // The existing day-operation refresh path must not reset independent drafts.
    (component as unknown as { run(operation: Observable<unknown>, key: string, day: number): void })
      .run(of(undefined), 'coachWorkspace.editor.saved', 1);
    expect(component.state.form.programName).toBe('Unsaved title');
    expect(component.state.form.programDescription).toBe('Unsaved notes');
    expect([...component.assignments.toAssign]).toEqual([7]);
    expect(component.hasUnsavedChanges).toBeTrue();
  });

  it('reports partial assignment and preserves only the athletes still needing assignment', () => {
    const first = new Subject<void>();
    const second = new Subject<void>();
    assignProgram.and.returnValues(first, second);
    component.assignments.toAssign = new Set([7, 8]);
    component.assignments.assignSelected();
    first.next(); first.complete();
    assigned = [7]; // The backend persisted the first assignment.
    second.error(new Error('offline'));
    expect(component.state.busy).toBeFalse();
    expect(component.state.message).toBe('coachWorkspace.editor.assignmentPartial');
    expect(component.state.messageParams).toEqual({ count: 1, total: 2 });
    expect([...component.assignments.assignedIds]).toEqual([7]);
    expect([...component.assignments.toAssign]).toEqual([8]);
  });
});
