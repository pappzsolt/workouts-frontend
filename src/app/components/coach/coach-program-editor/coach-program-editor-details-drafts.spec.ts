import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { Subject, of } from 'rxjs';
import { CoachWorkspaceService } from '../../../services/coach/coach-workspace.service';
import type { CoachProgram } from '../../../models/coach-workspace.model';
import { CoachProgramEditorComponent } from './coach-program-editor.component';

describe('Program details save preserves day drafts', () => {
  let component: CoachProgramEditorComponent;
  let program: CoachProgram;
  let save: Subject<void>;
  let refresh: Subject<CoachProgram>;
  let update: jasmine.Spy;
  beforeEach(() => {
    program = { programId: 1, programName: 'Program', programDescription: '', durationDays: 2,
      startDate: '2026-10-23', endDate: '2026-10-24', difficultyLevel: 'BEGINNER', workouts: [
        { programWorkoutId: 10, workoutId: 20, name: 'Workout', description: '', exercises: [
          { id: 30, name: 'Squat', description: '', sets: 3, repetitions: 10, restSeconds: 60, notes: null },
        ] },
      ] };
    save = new Subject<void>(); refresh = new Subject<CoachProgram>();
    update = jasmine.createSpy().and.returnValue(save);
    TestBed.configureTestingModule({ providers: [
      { provide: CoachWorkspaceService, useValue: {
        getProgram: jasmine.createSpy().and.returnValues(of(program), refresh),
        getProgramDays: () => of([{ id: 10, programId: 1, workoutId: 20, dayIndex: 1 }]),
        getOverview: () => of({ clients: [] }), getAssignedUserIds: () => of([]), getMyWorkouts: () => of([]),
        updateProgram: update,
      } },
      { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: '1' })) } },
      { provide: Router, useValue: {} },
    ] });
    component = TestBed.runInInjectionContext(() => new CoachProgramEditorComponent());
    component.ngOnInit();
  });
  function finish(): void {
    refresh.next({ ...program, programName: 'Renamed' }); refresh.complete();
  }

  it('keeps unsaved prescriptions after the program name is saved', () => {
    component.rows[0].sets = 5;
    component.form.programName = 'Renamed';
    component.saveDetails(); save.next(); save.complete(); finish();
    expect(component.form.programName).toBe('Renamed');
    expect(component.rows[0].sets).toBe(5);
    expect(component.rows[0].original.sets).toBe(3);
    expect(component.changedCount).toBe(1);
  });

  it('includes edits entered during the save and the subsequent reload', () => {
    component.form.programName = 'Renamed';
    component.saveDetails();
    component.rows[0].repetitions = 15;
    save.next(); save.complete();
    component.rows[0].restSeconds = 90;
    finish();
    expect(component.rows[0].repetitions).toBe(15);
    expect(component.rows[0].restSeconds).toBe(90);
    expect(component.changedCount).toBe(1);
  });

  it('keeps an unfinished new workout on an empty day', () => {
    component.selectDay(2);
    component.workoutName = 'Draft workout';
    component.pendingExercises = [{ id: 50, name: 'Press' } as never];
    component.form.programName = 'Renamed';
    component.saveDetails(); save.next(); save.complete(); finish();
    expect(component.selectedDay).toBe(2);
    expect(component.workoutName).toBe('Draft workout');
    expect(component.pendingIds).toEqual([50]);
  });

  it('blocks shortening the program if it would remove a day with a draft', () => {
    component.selectDay(2);
    component.workoutName = 'Draft workout';
    component.form.durationDays = 1;
    component.saveDetails();
    expect(update).not.toHaveBeenCalled();
    expect(component.message).toBe('coachWorkspace.editor.saveBeforeShortening');
    expect(component.workoutName).toBe('Draft workout');
  });

  it('keeps prescriptions if saving program details fails', () => {
    component.rows[0].sets = 5;
    component.saveDetails(); save.error(new Error('offline'));
    expect(component.rows[0].sets).toBe(5);
    expect(component.changedCount).toBe(1);
    expect(component.savingDetails).toBeFalse();
  });
});
