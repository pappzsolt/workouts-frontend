import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { CoachWorkspaceService } from '../../../services/coach/coach-workspace.service';
import type { CoachProgram } from '../../../models/coach-workspace.model';
import { CoachProgramEditorComponent } from './coach-program-editor.component';

const program: CoachProgram = {
  programId: 1, programName: 'Test', programDescription: '', durationDays: 3,
  startDate: '2026-10-23', endDate: '2026-10-25', difficultyLevel: 'BEGINNER',
  workouts: [{ programWorkoutId: 10, workoutId: 20, name: 'Workout', description: '',
    exercises: [{ id: 30, name: 'Squat', description: '', sets: 3, repetitions: 10, restSeconds: 60, notes: null }] }],
};

describe('Program editor day change protection', () => {
  let component: CoachProgramEditorComponent;
  let update: jasmine.Spy;
  beforeEach(() => {
    update = jasmine.createSpy().and.returnValue(of(undefined));
    TestBed.configureTestingModule({ providers: [
      { provide: CoachWorkspaceService, useValue: {
        getProgram: () => of(program), getProgramDays: () => of([{ id: 10, programId: 1, workoutId: 20, dayIndex: 1 }]),
        getOverview: () => of({ clients: [] }), getAssignedUserIds: () => of([]), getMyWorkouts: () => of([]),
        updatePrescription: update,
      } },
      { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: '1' })) } },
      { provide: Router, useValue: {} },
    ] });
    component = TestBed.runInInjectionContext(() => new CoachProgramEditorComponent());
    component.ngOnInit();
  });

  it('preserves unsaved prescriptions when clicking the selected day', () => {
    component.rows[0].sets = 5;
    component.selectDay(1);
    expect(component.rows[0].sets).toBe(5);
    expect(component.changedCount).toBe(1);
    expect(component.pendingDay).toBeNull();
  });

  it('waits for confirmation and preserves edits when the coach stays', () => {
    component.rows[0].sets = 5;
    component.selectDay(2);
    expect(component.selectedDay).toBe(1);
    expect(component.pendingDay).toBe(2);
    expect(component.rows[0].sets).toBe(5);
    component.cancelDayChange();
    expect(component.selectedDay).toBe(1);
    expect(component.rows[0].sets).toBe(5);
    expect(component.pendingDay).toBeNull();
  });

  it('discards only after explicit confirmation', () => {
    component.rows[0].sets = 5;
    component.selectDay(2);
    component.discardAndChangeDay();
    expect(component.selectedDay).toBe(2);
    expect(component.rows).toEqual([]);
    expect(update).not.toHaveBeenCalled();
    component.selectDay(1);
    expect(component.rows[0].sets).toBe(3);
  });

  it('protects an unfinished new workout when leaving an empty day', () => {
    component.selectDay(2);
    component.workoutName = 'Unfinished workout';
    component.selectDay(3);
    expect(component.selectedDay).toBe(2);
    expect(component.pendingDay).toBe(3);
    component.cancelDayChange();
    expect(component.workoutName).toBe('Unfinished workout');
  });

  it('allows clean day changes without prompting', () => {
    component.selectDay(2);
    expect(component.selectedDay).toBe(2);
    expect(component.pendingDay).toBeNull();
  });
});
