import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, ParamMap, Router, convertToParamMap } from '@angular/router';
import { Subject, of } from 'rxjs';
import { CoachWorkspaceService } from '../../../services/coach/coach-workspace.service';
import type { ClientProgramRow, ClientWorkoutSet, CoachClientOverview, CoachProgram } from '../../../models/coach-workspace.model';
import { CoachClientDetailComponent } from './coach-client-detail.component';

const row: ClientProgramRow = {
  scheduled_date: '2026-10-23', program_day_index: 1, user_workout_id: 11, program_workout_id: 21,
  workout_id: 31, workout_name: 'Workout', workout_exercise_id: 41, exercise_id: 51,
  exercise_name: 'Squat', exercise_order: 0, workout_completed: false,
  user_workout_exercise_id: 61, exercise_completed: false, sets_done: 1, sets_completed: 0,
};
const set: ClientWorkoutSet = {
  id: 71, userWorkoutExerciseId: 61, setNumber: 1, targetRepetitions: 10, targetWeightKg: 20,
  restSeconds: 60, targetRpe: 7.5, actualRepetitions: 8, actualWeightKg: 15,
  completed: false, notes: 'old note', startedAt: null, completedAt: null,
};
const client: CoachClientOverview = {
  userId: 7, username: 'Anna', email: 'a@example.com', age: null, weight: null, height: null,
  gender: null, goals: null, lastCompletedAt: null, workouts: [],
  programs: [{ programId: 1, name: 'Current', startDate: null, endDate: null, totalWorkouts: 1, completedWorkouts: 0 }],
};
const program = (id: number, startDate: string | null): CoachProgram => ({
  programId: id, programName: `Program ${id}`, startDate, endDate: null,
  programDescription: null, durationDays: null, difficultyLevel: null, workouts: [],
});

describe('Client editing workflow behavior', () => {
  let component: CoachClientDetailComponent;
  let api: jasmine.SpyObj<CoachWorkspaceService>;
  let routes: Subject<ParamMap>;

  beforeEach(() => {
    routes = new Subject<ParamMap>();
    api = jasmine.createSpyObj('workspace', ['getClientProgramRows', 'getClientWorkoutSets', 'getOverview',
      'addClientSet', 'saveClientSet', 'deleteClientSet', 'rescheduleWorkout', 'getCoachPrograms', 'assignProgram', 'revokeProgram']);
    api.getClientProgramRows.and.returnValue(of([row]));
    api.getClientWorkoutSets.and.returnValue(of([set]));
    api.getOverview.and.returnValue(of({ from: '', to: '', clients: [client] }));
    TestBed.configureTestingModule({ providers: [
      { provide: CoachWorkspaceService, useValue: api },
      { provide: ActivatedRoute, useValue: { paramMap: routes, snapshot: { queryParamMap: convertToParamMap({}) } } },
      { provide: Router, useValue: { navigate: jasmine.createSpy() } },
    ] });
    component = TestBed.runInInjectionContext(() => new CoachClientDetailComponent());
    component.userId = 7;
    component.client = structuredClone(client);
    component.selectProgram(1);
  });

  it('prefills only target values when adding a set and keeps existing edits', () => {
    const added = new Subject<number>();
    const saved = new Subject<void>();
    api.addClientSet.and.returnValue(added);
    api.saveClientSet.and.returnValue(saved);
    const entry = component.setEditor.exerciseSets[0];
    entry.sets[0].targetRepetitions = 12;
    component.setEditor.addSet(entry);
    component.setEditor.addSet(entry);
    expect(api.addClientSet).toHaveBeenCalledOnceWith(61);
    expect(component.setEditor.setBusy).toBeTrue();
    added.next(72);
    expect(api.saveClientSet).toHaveBeenCalledOnceWith(72, {
      targetRepetitions: 12, targetWeightKg: 20, restSeconds: 60, targetRpe: 7.5,
      actualRepetitions: null, actualWeightKg: null, notes: null, completed: false,
    });
    saved.next();
    expect(component.setEditor.setBusy).toBeFalse();
    expect(entry.exercise.setsTotal).toBe(2);
    expect(component.selected?.setsTotal).toBe(2);
    expect(entry.sets[0].targetRepetitions).toBe(12);
    expect(component.setEditor.dirty).toBeTrue();
  });

  it('reloads sets and preserves edits if new-set prefilling fails', () => {
    api.addClientSet.and.returnValue(of(72));
    const save = new Subject<void>();
    api.saveClientSet.and.returnValue(save);
    const entry = component.setEditor.exerciseSets[0];
    entry.sets[0].notes = 'unsaved';
    component.setEditor.addSet(entry);
    save.error(new Error('prefill failed'));
    expect(component.setEditor.setBusy).toBeFalse();
    expect(entry.sets[0].notes).toBe('unsaved');
    expect(entry.exercise.setsTotal).toBe(1);
    expect(component.message).toBe('prefill failed');
    expect(api.getClientWorkoutSets).toHaveBeenCalledTimes(2);
  });

  it('reports a failed add without attempting a set save', () => {
    const added = new Subject<number>();
    api.addClientSet.and.returnValue(added);
    component.setEditor.addSet(component.setEditor.exerciseSets[0]);
    added.error({});
    expect(component.setEditor.setBusy).toBeFalse();
    expect(component.message).toBe('coachWorkspace.client.addSetError');
    expect(api.saveClientSet).not.toHaveBeenCalled();
  });

  it('updates completed totals when deleting a confirmed completed set', () => {
    const entry = component.setEditor.exerciseSets[0];
    entry.sets[0].original.completed = true;
    entry.exercise.setsCompleted = 1;
    api.getClientWorkoutSets.and.returnValue(of([]));
    const deleted = new Subject<void>();
    api.deleteClientSet.and.returnValue(deleted);
    component.setEditor.askDeleteSet(entry.sets[0]);
    component.setEditor.confirmDeleteSet(entry);
    component.setEditor.confirmDeleteSet(entry);
    expect(api.deleteClientSet).toHaveBeenCalledOnceWith(71);
    deleted.next();
    expect(entry.sets).toEqual([]);
    expect(entry.exercise.setsTotal).toBe(0);
    expect(entry.exercise.setsCompleted).toBe(0);
    expect(component.selected?.setsTotal).toBe(0);
    expect(component.selected?.setsCompleted).toBe(0);
    expect(component.setEditor.deleteSetId).toBeNull();
    expect(component.setEditor.setBusy).toBeFalse();
    expect(component.message).toBe('coachWorkspace.client.setDeleted');
  });

  it('keeps the row after failed deletion and clears confirmation state', () => {
    const deleted = new Subject<void>();
    api.deleteClientSet.and.returnValue(deleted);
    const entry = component.setEditor.exerciseSets[0];
    component.setEditor.askDeleteSet(entry.sets[0]);
    component.setEditor.confirmDeleteSet(entry);
    deleted.error({});
    expect(entry.sets.length).toBe(1);
    expect(component.setEditor.deleteSetId).toBeNull();
    expect(component.setEditor.setBusy).toBeFalse();
    expect(component.message).toBe('coachWorkspace.client.deleteSetError');
  });

  it('blocks invalid saves and only navigates after a valid save is confirmed', () => {
    const entry = component.setEditor.exerciseSets[0];
    entry.sets[0].targetRepetitions = 0;
    component.setTab('programs');
    component.resolvePending('save');
    expect(api.saveClientSet).not.toHaveBeenCalled();
    expect(component.tab).toBe('plan');
    expect(component.pendingNav).not.toBeNull();
    expect(component.message).toBe('coachWorkspace.client.invalidSetValues');
    entry.sets[0].targetRepetitions = 12;
    const saved = new Subject<void>();
    api.saveClientSet.and.returnValue(saved);
    component.resolvePending('save');
    saved.next(); saved.complete();
    expect(component.tab).toBe('programs');
    expect(component.pendingNav).toBeNull();
  });

  it('filters assigned programs, sorts by start date, and selects the newest', () => {
    api.getCoachPrograms.and.returnValue(of([program(2, null), program(1, '2027-01-01'), program(3, '2026-11-01')]));
    component.assignments.openAssign(component.client);
    expect(component.assignments.assignOpen).toBeTrue();
    expect(component.assignments.assignLoading).toBeFalse();
    expect(component.assignments.assignablePrograms.map(p => p.programId)).toEqual([3, 2]);
    expect(component.assignments.assignProgramId).toBe(3);
  });

  it('closes the assignment dialog on list failure and preserves the error message', () => {
    const programs = new Subject<CoachProgram[]>();
    api.getCoachPrograms.and.returnValue(programs);
    component.assignments.openAssign(component.client);
    expect(component.assignments.assignLoading).toBeTrue();
    programs.error(new Error('program list failed'));
    expect(component.assignments.assignOpen).toBeFalse();
    expect(component.assignments.assignLoading).toBeFalse();
    expect(component.message).toBe('program list failed');
  });

  it('blocks repeated assignment and closing during assignment, then selects the assigned program', () => {
    api.getCoachPrograms.and.returnValue(of([program(3, '2026-11-01')]));
    const assigned = new Subject<string | null>();
    api.assignProgram.and.returnValue(assigned);
    component.assignments.openAssign(component.client);
    component.tab = 'programs';
    api.getOverview.and.returnValue(of({ from: '', to: '', clients: [{ ...client,
      programs: [...client.programs, { ...client.programs[0], programId: 3 }],
    }] }));
    component.assignments.confirmAssign(component.userId); component.assignments.confirmAssign(component.userId); component.assignments.closeAssign();
    expect(api.assignProgram).toHaveBeenCalledOnceWith(7, 3);
    expect(component.assignments.assignOpen).toBeTrue();
    assigned.next(null);
    expect(component.assignments.assigning).toBeFalse();
    expect(component.assignments.assignOpen).toBeFalse();
    expect(component.tab).toBe('plan');
    expect(api.getOverview).toHaveBeenCalledOnceWith(component.todayIso, component.todayIso, 7);
    expect(component.message).toBe('coachWorkspace.client.assignedNamed');
    expect(component.messageParams).toEqual({ program: 'Program 3' });
    expect(component.programId).toBe(3);
    expect(api.getClientProgramRows).toHaveBeenCalledWith(7, 3);
  });

  it('keeps the dialog open for retry after assignment failure', () => {
    api.getCoachPrograms.and.returnValue(of([program(3, null)]));
    const assigned = new Subject<string | null>();
    api.assignProgram.and.returnValue(assigned);
    component.assignments.openAssign(component.client); component.assignments.confirmAssign(component.userId);
    assigned.error({});
    expect(component.assignments.assignOpen).toBeTrue();
    expect(component.assignments.assigning).toBeFalse();
    expect(component.message).toBe('coachWorkspace.client.assignError');
  });

  it('revokes the selected program and clears its workout when no assignments remain', () => {
    api.getOverview.and.returnValue(of({ from: '', to: '', clients: [{ ...client, programs: [] }] }));
    api.revokeProgram.and.returnValue(of(undefined));
    component.assignments.askRevoke(1); component.assignments.confirmRevoke(component.userId);
    expect(api.revokeProgram).toHaveBeenCalledOnceWith(1, 7);
    expect(component.assignments.revokeProgramId).toBeNull();
    expect(component.programId).toBeNull();
    expect(component.workouts).toEqual([]);
    expect(component.setEditor.exerciseSets).toEqual([]);
    expect(component.message).toBe('coachWorkspace.client.revoked');
  });

  it('reports revocation failure without clearing the selected program', () => {
    const revoked = new Subject<void>();
    api.revokeProgram.and.returnValue(revoked);
    component.assignments.askRevoke(1); component.assignments.confirmRevoke(component.userId);
    revoked.error({});
    expect(component.programId).toBe(1);
    expect(component.assignments.revokeProgramId).toBeNull();
    expect(component.message).toBe('coachWorkspace.client.revokeError');
  });

  it('does not submit an unchanged or empty date', () => {
    component.schedule.reschedule(component.selected);
    component.schedule.rescheduleDate = ''; component.schedule.reschedule(component.selected);
    expect(api.rescheduleWorkout).not.toHaveBeenCalled();
  });

  it('reloads the selected workout after successful rescheduling', () => {
    const scheduled = new Subject<void>();
    api.rescheduleWorkout.and.returnValue(scheduled);
    component.schedule.rescheduleDate = '2026-10-24'; component.schedule.reschedule(component.selected);
    expect(api.rescheduleWorkout).toHaveBeenCalledOnceWith(11, '2026-10-24');
    api.getClientProgramRows.and.returnValue(of([{ ...row, scheduled_date: '2026-10-24' }]));
    scheduled.next();
    expect(component.selected?.userWorkoutId).toBe(11);
    expect(component.schedule.rescheduleDate).toBe('2026-10-24');
    expect(component.message).toBe('coachWorkspace.client.rescheduled');
  });

  it('keeps the edited date and current workout after rescheduling failure', () => {
    const scheduled = new Subject<void>();
    api.rescheduleWorkout.and.returnValue(scheduled);
    component.schedule.rescheduleDate = '2026-10-24'; component.schedule.reschedule(component.selected);
    scheduled.error({});
    expect(component.schedule.rescheduleDate).toBe('2026-10-24');
    expect(component.selected?.date).toBe('2026-10-23');
    expect(api.getClientProgramRows).toHaveBeenCalledTimes(1);
    expect(component.message).toBe('coachWorkspace.client.rescheduleError');
  });

  it('cancels pending edits, program actions, and rescheduling on client context change', () => {
    component.ngOnInit();
    const added = new Subject<number>();
    const revoked = new Subject<void>();
    const scheduled = new Subject<void>();
    const programs = new Subject<CoachProgram[]>();
    api.addClientSet.and.returnValue(added); api.revokeProgram.and.returnValue(revoked);
    api.rescheduleWorkout.and.returnValue(scheduled); api.getCoachPrograms.and.returnValue(programs);
    component.setEditor.addSet(component.setEditor.exerciseSets[0]);
    component.assignments.askRevoke(1); component.assignments.confirmRevoke(component.userId);
    component.schedule.rescheduleDate = '2026-10-24'; component.schedule.reschedule(component.selected);
    component.assignments.openAssign(component.client);
    routes.next(convertToParamMap({ userId: 8 }));
    expect(added.observed).toBeFalse(); expect(revoked.observed).toBeFalse();
    expect(scheduled.observed).toBeFalse(); expect(programs.observed).toBeFalse();
    expect(component.setEditor.setBusy).toBeFalse(); expect(component.assignments.assignOpen).toBeFalse();
    expect(component.setEditor.exerciseSets).toEqual([]); expect(component.message).toBe('');
    added.next(99); revoked.next(); scheduled.next(); programs.next([]);
    expect(component.message).toBe(''); expect(api.getOverview).toHaveBeenCalledTimes(1);
  });
});
