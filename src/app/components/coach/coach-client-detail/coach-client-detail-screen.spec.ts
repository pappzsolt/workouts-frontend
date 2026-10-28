import { By } from '@angular/platform-browser';
import { provideTranslateService } from '@ngx-translate/core';
import { provideRouter } from '@angular/router';
import { ClientAssignDialogComponent } from './parts/client-assign-dialog.component';
import { ClientExerciseSetsComponent } from './parts/client-exercise-sets.component';
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

describe('Client editing screen bindings', () => {
  let api: jasmine.SpyObj<CoachWorkspaceService>;

  beforeEach(() => {
    api = jasmine.createSpyObj('workspace', ['getClientProgramRows', 'getClientWorkoutSets', 'getOverview',
      'addClientSet', 'saveClientSet', 'deleteClientSet', 'rescheduleWorkout', 'getCoachPrograms', 'assignProgram', 'revokeProgram']);
    api.getClientProgramRows.and.returnValue(of([row]));
    api.getClientWorkoutSets.and.returnValue(of([set]));
    api.getOverview.and.returnValue(of({ from: '', to: '', clients: [client] }));
    TestBed.configureTestingModule({
      imports: [CoachClientDetailComponent],
      providers: [
        provideRouter([]), provideTranslateService(),
        { provide: CoachWorkspaceService, useValue: api },
        { provide: ActivatedRoute, useValue: {
          paramMap: of(convertToParamMap({ userId: '7' })),
          snapshot: { queryParamMap: convertToParamMap({}) },
        } },
      ],
    });
  });

  const button = (element: HTMLElement, key: string): HTMLButtonElement => {
    const result = [...element.querySelectorAll('button')].find(item => item.textContent?.includes(key));
    expect(result).withContext(`Button for ${key}`).toBeDefined();
    return result!;
  };

  it('connects exercise set add/delete outputs to their state owner', () => {
    api.addClientSet.and.returnValue(of(72));
    api.saveClientSet.and.returnValue(of(undefined));
    api.deleteClientSet.and.returnValue(of(undefined));
    const fixture = TestBed.createComponent(CoachClientDetailComponent);
    fixture.detectChanges();
    const child = fixture.debugElement.query(By.directive(ClientExerciseSetsComponent)).componentInstance as ClientExerciseSetsComponent;
    expect(child.entry.exercise.userWorkoutExerciseId).toBe(61);
    child.addSet.emit();
    expect(api.addClientSet).toHaveBeenCalledOnceWith(61);
    child.askDelete.emit(child.entry.sets[0]);
    fixture.detectChanges();
    expect(child.deleteSetId).toBe(71);
    child.confirmDelete.emit();
    fixture.detectChanges();
    expect(api.deleteClientSet).toHaveBeenCalledOnceWith(71);
    expect(child.deleteSetId).toBeNull();
    expect(child.setBusy).toBeFalse();
  });

  it('connects program selection and confirmation through the assignment dialog', () => {
    api.getCoachPrograms.and.returnValue(of([program(3, '2026-11-01'), program(4, '2026-10-01')]));
    const assigned = new Subject<string | null>();
    api.assignProgram.and.returnValue(assigned);
    const fixture = TestBed.createComponent(CoachClientDetailComponent);
    fixture.detectChanges();
    button(fixture.nativeElement, 'coachWorkspace.client.assignProgram').click();
    fixture.detectChanges();
    const dialog = fixture.debugElement.query(By.directive(ClientAssignDialogComponent)).componentInstance as ClientAssignDialogComponent;
    expect(dialog.selectedId).toBe(3);
    dialog.selectedIdChange.emit(4);
    fixture.detectChanges();
    dialog.confirmed.emit();
    fixture.detectChanges();
    expect(api.assignProgram).toHaveBeenCalledOnceWith(7, 4);
    expect(dialog.assigning).toBeTrue();
    assigned.next(null);
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.directive(ClientAssignDialogComponent))).toBeNull();
    expect(fixture.componentInstance.messageParams).toEqual({ program: 'Program 4' });
  });

  it('submits the date entered in the form for the selected workout', async () => {
    api.rescheduleWorkout.and.returnValue(of(undefined));
    const fixture = TestBed.createComponent(CoachClientDetailComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const input = fixture.nativeElement.querySelector('input[name="rescheduleDate"]') as HTMLInputElement;
    expect(input.value).toBe('2026-10-23');
    input.value = '2026-10-24';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    const save = button(fixture.nativeElement, 'coachWorkspace.client.saveDate');
    expect(save.disabled).toBeFalse();
    save.click();
    expect(api.rescheduleWorkout).toHaveBeenCalledOnceWith(11, '2026-10-24');
  });

  it('saves edited sets from the sticky action bar and clears the dirty indicator on confirmation', () => {
    const saved = new Subject<void>();
    api.saveClientSet.and.returnValue(saved);
    const fixture = TestBed.createComponent(CoachClientDetailComponent);
    fixture.detectChanges();
    const child = fixture.debugElement.query(By.directive(ClientExerciseSetsComponent)).componentInstance as ClientExerciseSetsComponent;
    child.entry.sets[0].targetRepetitions = 12;
    fixture.detectChanges();
    const save = button(fixture.nativeElement, 'coachWorkspace.client.saveChanges');
    expect(save.disabled).toBeFalse();
    save.click();
    fixture.detectChanges();
    expect(api.saveClientSet.calls.mostRecent().args[1].targetRepetitions).toBe(12);
    expect(save.disabled).toBeTrue();
    saved.next(); saved.complete();
    fixture.detectChanges();
    expect(fixture.componentInstance.setEditor.dirty).toBeFalse();
    expect(fixture.componentInstance.message).toBe('coachWorkspace.client.saved');
  });

  it('cancels requests owned by all extracted units when the screen is destroyed', () => {
    const added = new Subject<number>();
    const scheduled = new Subject<void>();
    const programs = new Subject<CoachProgram[]>();
    api.addClientSet.and.returnValue(added);
    api.rescheduleWorkout.and.returnValue(scheduled);
    api.getCoachPrograms.and.returnValue(programs);
    const fixture = TestBed.createComponent(CoachClientDetailComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.setEditor.addSet(component.setEditor.exerciseSets[0]);
    component.schedule.rescheduleDate = '2026-10-24';
    component.schedule.reschedule(component.selected);
    component.assignments.openAssign(component.client);
    expect(added.observed).toBeTrue(); expect(scheduled.observed).toBeTrue(); expect(programs.observed).toBeTrue();
    fixture.destroy();
    expect(added.observed).toBeFalse(); expect(scheduled.observed).toBeFalse(); expect(programs.observed).toBeFalse();
    added.next(99); scheduled.next(); programs.next([]);
    expect(api.saveClientSet).not.toHaveBeenCalled();
    expect(api.getClientProgramRows).toHaveBeenCalledTimes(1);
  });
});
