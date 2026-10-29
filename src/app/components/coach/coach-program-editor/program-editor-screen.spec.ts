import type { Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { Subject, of } from 'rxjs';
import type { CoachClientOverview, CoachProgram } from '../../../models/coach-workspace.model';
import { CoachWorkspaceService } from '../../../services/coach/coach-workspace.service';
import { CoachProgramEditorComponent } from './coach-program-editor.component';
import { ProgramClientsPanelComponent } from './parts/program-clients-panel.component';
import { ProgramCopyDialogComponent } from './parts/program-copy-dialog.component';
import { ProgramDayGridComponent } from './parts/program-day-grid.component';
import { ProgramDayWorkoutComponent } from './parts/program-day-workout.component';
import { ProgramDetailsFormComponent } from './parts/program-details-form.component';
import { ProgramEmptyDayComponent } from './parts/program-empty-day.component';
import { ProgramMultiAddDialogComponent } from './parts/program-multi-add-dialog.component';

const client: CoachClientOverview = {
  userId: 7, username: 'Anna', email: 'anna@example.com', age: null, weight: null,
  height: null, gender: null, goals: null, lastCompletedAt: null, programs: [], workouts: [],
};

describe('Program editor screen bindings', () => {
  let api: jasmine.SpyObj<CoachWorkspaceService>;
  let program: CoachProgram;
  let routeId: string;

  beforeEach(() => {
    routeId = '10';
    program = {
      programId: 10, programName: 'Program', programDescription: '', durationDays: 3,
      difficultyLevel: 'BEGINNER', startDate: '2026-10-23', endDate: '2026-10-25',
      workouts: [{
        programWorkoutId: 11, workoutId: 20, name: 'Workout', description: '',
        exercises: [{ id: 30, name: 'Squat', description: '', sets: 3, repetitions: 10, restSeconds: 60, notes: null }],
      }],
    };
    api = jasmine.createSpyObj<CoachWorkspaceService>('workspace', [
      'getProgram', 'getProgramDays', 'getOverview', 'getAssignedUserIds', 'getMyWorkouts',
      'updateProgram', 'updatePrescription', 'createWorkout', 'addExerciseToWorkout',
      'addWorkoutToDay', 'copyProgram', 'assignProgram', 'createProgram',
      'browseExercises', 'getExerciseFilterOptions',
    ]);
    api.getProgram.and.callFake(() => of(program));
    api.getProgramDays.and.returnValue(of([{ id: 11, programId: 10, workoutId: 20, dayIndex: 1 }]));
    api.getOverview.and.returnValue(of({ from: '', to: '', clients: [client] }));
    api.getAssignedUserIds.and.returnValue(of([]));
    api.getMyWorkouts.and.returnValue(of([
      { id: 40, name: 'Press', description: null }, { id: 50, name: 'Pull', description: null },
    ]));
    api.browseExercises.and.returnValue(of({ items: [], totalElements: 0, totalPages: 1 }));
    api.getExerciseFilterOptions.and.returnValue(of({ bodyParts: [], equipment: [] }));
    TestBed.configureTestingModule({
      imports: [CoachProgramEditorComponent],
      providers: [
        provideRouter([]), provideTranslateService(),
        { provide: CoachWorkspaceService, useValue: api },
        { provide: ActivatedRoute, useFactory: () => ({
          paramMap: of(convertToParamMap({ id: routeId })),
          snapshot: { queryParamMap: convertToParamMap({ userId: '7' }) },
        }) },
      ],
    });
  });

  function render(): ComponentFixture<CoachProgramEditorComponent> {
    const fixture = TestBed.createComponent(CoachProgramEditorComponent);
    fixture.detectChanges();
    return fixture;
  }

  function child<T>(fixture: ComponentFixture<CoachProgramEditorComponent>, type: Type<T>): T {
    return fixture.debugElement.query(By.directive(type)).componentInstance as T;
  }

  function button(fixture: ComponentFixture<CoachProgramEditorComponent>, key: string): HTMLButtonElement {
    const element = fixture.nativeElement as HTMLElement;
    return [...element.querySelectorAll('button')].find(item => item.textContent?.includes(key))!;
  }

  it('connects metadata and prescription saves to the shared busy state', () => {
    const save = new Subject<void>();
    api.updateProgram.and.returnValue(save);
    api.updatePrescription.and.returnValue(of(undefined));
    const fixture = render();
    const details = child(fixture, ProgramDetailsFormComponent);
    const workout = child(fixture, ProgramDayWorkoutComponent);
    details.form.programName = 'Renamed';
    workout.rows[0].sets = 5;
    details.save.emit();
    fixture.detectChanges();
    expect(api.updateProgram).toHaveBeenCalledOnceWith(10, jasmine.objectContaining({ programName: 'Renamed' }));
    expect(workout.saveDisabled).toBeTrue();
    workout.savePrescriptions.emit();
    expect(api.updatePrescription).not.toHaveBeenCalled();
    program.programName = 'Renamed';
    save.next(); save.complete();
    fixture.detectChanges();
    expect(details.saving).toBeFalse();
    expect(workout.rows[0].sets).toBe(5);
    workout.savePrescriptions.emit();
    expect(api.updatePrescription).toHaveBeenCalledOnceWith(20, 30, { sets: 5, repetitions: 10, restSeconds: 60 });
  });

  it('creates an empty-day workout before saving its exercises and linking the day', () => {
    const created = new Subject<number>();
    const exerciseSaved = new Subject<void>();
    const linked = new Subject<void>();
    api.createWorkout.and.returnValue(created);
    api.addExerciseToWorkout.and.returnValue(exerciseSaved);
    api.addWorkoutToDay.and.returnValue(linked);
    const fixture = render();
    child(fixture, ProgramDayGridComponent).daySelected.emit(2);
    fixture.detectChanges();
    const empty = child(fixture, ProgramEmptyDayComponent);
    empty.workoutName.set('New workout');
    empty.addPending.emit({ id: 60, name: 'Press', muscleGroup: null, equipment: null });
    empty.create.emit();
    expect(api.createWorkout).toHaveBeenCalledOnceWith('New workout', '2026-10-24');
    expect(api.addExerciseToWorkout).not.toHaveBeenCalled();
    created.next(70); created.complete();
    expect(api.addExerciseToWorkout).toHaveBeenCalledOnceWith(70, 60);
    expect(exerciseSaved.observed).toBeTrue();
    expect(linked.observed).toBeFalse();
    exerciseSaved.next(); exerciseSaved.complete();
    expect(api.addWorkoutToDay).toHaveBeenCalledOnceWith(10, 70, 2);
    expect(fixture.componentInstance.state.busy).toBeTrue();
    linked.next(); linked.complete();
    expect(fixture.componentInstance.state.busy).toBeFalse();
    expect(fixture.componentInstance.state.selectedDay).toBe(2);
  });

  it('adds library workouts in selection order to consecutive available days', () => {
    const first = new Subject<void>();
    const second = new Subject<void>();
    api.addWorkoutToDay.and.returnValues(first, second);
    const fixture = render();
    child(fixture, ProgramDayGridComponent).openMulti.emit();
    fixture.detectChanges();
    const dialog = child(fixture, ProgramMultiAddDialogComponent);
    dialog.toggle.emit({ workoutId: 50, checked: true });
    dialog.toggle.emit({ workoutId: 40, checked: true });
    fixture.detectChanges();
    expect(dialog.selected).toEqual([50, 40]);
    expect(dialog.targetDays).toEqual([2, 3]);
    dialog.confirmed.emit();
    expect(api.addWorkoutToDay.calls.allArgs()).toEqual([[10, 50, 2], [10, 40, 3]]);
    expect(first.observed).toBeTrue();
    expect(second.observed).toBeFalse();
    first.next(); first.complete();
    expect(second.observed).toBeTrue();
    expect(fixture.componentInstance.state.busy).toBeTrue();
    second.next(); second.complete();
    fixture.detectChanges();
    expect(fixture.componentInstance.state.busy).toBeFalse();
    expect(fixture.debugElement.query(By.directive(ProgramMultiAddDialogComponent))).toBeNull();
  });

  it('copies the program with the values entered in the dialog', () => {
    const request = new Subject<number>();
    api.copyProgram.and.returnValue(request);
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    const fixture = render();
    button(fixture, 'coachWorkspace.editor.copyProgram').click();
    fixture.detectChanges();
    const dialog = child(fixture, ProgramCopyDialogComponent);
    expect(dialog.clients).toEqual([client]);
    dialog.copyName.set('Copy');
    dialog.copyStart.set('2026-11-01');
    dialog.copyUserId.set(7);
    dialog.confirmed.emit();
    fixture.detectChanges();
    expect(api.copyProgram).toHaveBeenCalledOnceWith(10, 'Copy', '2026-11-01', 7);
    expect(dialog.busy).toBeTrue();
    expect(navigate).not.toHaveBeenCalled();
    request.next(90); request.complete();
    fixture.detectChanges();
    expect(navigate).toHaveBeenCalledOnceWith(['/coach/programs', 90]);
    expect(fixture.debugElement.query(By.directive(ProgramCopyDialogComponent))).toBeNull();
  });

  it('connects client filtering, selection and assignment to the panel', () => {
    const request = new Subject<string | null>();
    api.assignProgram.and.returnValue(request);
    const fixture = render();
    const panel = child(fixture, ProgramClientsPanelComponent);
    panel.clientFilter.set('anna');
    fixture.detectChanges();
    expect(panel.visibleClients).toEqual([client]);
    panel.selectVisible.emit();
    fixture.detectChanges();
    expect([...panel.toAssign]).toEqual([7]);
    panel.assignSelected.emit();
    fixture.detectChanges();
    expect(api.assignProgram).toHaveBeenCalledOnceWith(7, 10);
    expect(panel.busy).toBeTrue();
    api.getAssignedUserIds.and.returnValue(of([7]));
    request.next(null); request.complete();
    fixture.detectChanges();
    expect(panel.busy).toBeFalse();
    expect(panel.assignedClients).toEqual([client]);
    expect(panel.toAssign.size).toBe(0);
  });

  it('assigns a newly created client program before navigating to it', () => {
    routeId = 'new';
    const created = new Subject<number>();
    const assigned = new Subject<string | null>();
    api.createProgram.and.returnValue(created);
    api.assignProgram.and.returnValue(assigned);
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    const fixture = render();
    const details = child(fixture, ProgramDetailsFormComponent);
    details.form.programName = 'New program';
    details.save.emit();
    created.next(90); created.complete();
    expect(api.assignProgram).toHaveBeenCalledOnceWith(7, 90);
    expect(navigate).not.toHaveBeenCalled();
    assigned.next(null); assigned.complete();
    fixture.detectChanges();
    expect(fixture.componentInstance.state.messageParams).toEqual({ name: 'Anna' });
    expect(navigate).toHaveBeenCalledOnceWith(['/coach/programs', 90], { replaceUrl: true });
  });

  it('cancels a handler request when the editor is destroyed', () => {
    const request = new Subject<number>();
    api.copyProgram.and.returnValue(request);
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    const fixture = render();
    button(fixture, 'coachWorkspace.editor.copyProgram').click();
    fixture.detectChanges();
    child(fixture, ProgramCopyDialogComponent).confirmed.emit();
    expect(request.observed).toBeTrue();
    fixture.destroy();
    expect(request.observed).toBeFalse();
    request.next(90); request.complete();
    expect(navigate).not.toHaveBeenCalled();
  });
});
