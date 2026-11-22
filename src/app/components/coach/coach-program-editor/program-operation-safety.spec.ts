import { LanguageService } from '../../../services/shared/language.service';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of, Subject } from 'rxjs';
import { CoachWorkspaceService } from '../../../services/coach/coach-workspace.service';
import { CoachProgramEditorComponent } from './coach-program-editor.component';
import type { CoachProgram, CoachProgramDayLink } from '../../../models/coach-workspace.model';

const program: CoachProgram = { programId: 10, programName: 'Review', programDescription: '', durationDays: 21,
  difficultyLevel: 'BEGINNER', startDate: '2026-11-13', endDate: '2026-12-03', workouts: [{
    programWorkoutId: 11, workoutId: 20, name: 'Workout', description: '', exercises: [],
  }] };

describe('Program operation safety', () => {
  let component: CoachProgramEditorComponent;
  let api: jasmine.SpyObj<CoachWorkspaceService>;
  beforeEach(() => {
    api = jasmine.createSpyObj('workspace', ['getProgram','getProgramDays','getOverview','getAssignedUserIds','getMyWorkouts',
      'updateProgram','moveWorkoutToDay','addWorkoutToDay','removeWorkoutFromDay','createWorkout','copyWorkoutToDay',
      'copyWorkout','copyProgram','assignProgram','revokeProgram']);
    api.getProgram.and.returnValue(of(program));
    api.getProgramDays.and.returnValue(of([{id:11,programId:10,workoutId:20,dayIndex:1}]));
    api.getOverview.and.returnValue(of({from:'',to:'',clients:[]}));
    api.getAssignedUserIds.and.returnValue(of([])); api.getMyWorkouts.and.returnValue(of([]));
    TestBed.configureTestingModule({providers: [{ provide: LanguageService, useValue: { getCurrentLanguage: () => 'hu', language$: of('hu') } },
      {provide:CoachWorkspaceService,useValue:api},
      {provide:ActivatedRoute,useValue:{paramMap:of(convertToParamMap({id:'10'})),snapshot:{queryParamMap:convertToParamMap({})}}},
      {provide:Router,useValue:{}},
    ]});
    component=TestBed.runInInjectionContext(()=>new CoachProgramEditorComponent()); component.ngOnInit();
  });

  it('blocks weekly writes after a partial failure until a fresh schedule is explicitly reconciled', () => {
    const first = new Subject<void>();
    const second = new Subject<void>();
    const refresh = new Subject<CoachProgramDayLink[]>();
    api.addWorkoutToDay.and.returnValues(first, second);
    const original = { id: 11, programId: 10, workoutId: 20, dayIndex: 1 };
    api.getProgramDays.and.returnValue(refresh);
    component.state.form.programName = 'Unsaved name';
    component.workouts.repeatWeekly();
    first.next(); first.complete();
    second.error(new Error('Offline'));
    refresh.error(new Error('Reload failed'));
    component.workouts.repeatWeekly();
    expect(api.addWorkoutToDay.calls.allArgs()).toEqual([[10, 20, 8], [10, 20, 15]]);
    expect(component.state.form.programName).toBe('Unsaved name');
    expect(component.state.message).toBe('coachWorkspace.editor.repeatPartial');
    expect(component.workouts.needsRepeatReconciliation).toBeTrue();

    // A manual refresh reconciles against the *current* server schedule.
    // If the previously confirmed day was removed elsewhere, it must be
    // eligible for a new repeat rather than leaving the editor locked forever.
    api.getProgramDays.and.returnValue(of([original]));
    component.workouts.refreshRepeatSchedule();
    expect(component.workouts.needsRepeatReconciliation).toBeFalse();
    expect(component.state.message).toBe('coachWorkspace.editor.repeatScheduleChanged');
    expect(api.addWorkoutToDay).toHaveBeenCalledTimes(2);
    expect(component.state.form.programName).toBe('Unsaved name');

    // A deliberate retry must follow the freshly loaded dates, not the old
    // partial-write confirmation. It must not happen before refresh.
    const retry = new Subject<void>();
    api.addWorkoutToDay.and.returnValues(of(undefined), retry);
    component.workouts.repeatWeekly();
    expect(api.addWorkoutToDay.calls.allArgs()).toEqual([
      [10, 20, 8], [10, 20, 15], [10, 20, 8], [10, 20, 15],
    ]);
  });

  it('does not resend a day present in the refreshed schedule after a lost write response', () => {
    const lostResponse = new Subject<void>();
    api.addWorkoutToDay.and.returnValues(of(undefined), lostResponse);
    component.workouts.repeatWeekly();
    expect(api.addWorkoutToDay.calls.allArgs()).toEqual([[10, 20, 8], [10, 20, 15]]);
    api.getProgramDays.and.returnValue(of([
      { id: 11, programId: 10, workoutId: 20, dayIndex: 1 },
      { id: 12, programId: 10, workoutId: 20, dayIndex: 8 },
      { id: 13, programId: 10, workoutId: 20, dayIndex: 15 },
    ]));
    lostResponse.error(new Error('Response lost'));
    expect(component.workouts.needsRepeatReconciliation).toBeFalse();
    expect(component.workouts.weeklyRepeatDays).toEqual([]);
    component.workouts.repeatWeekly();
    expect(api.addWorkoutToDay).toHaveBeenCalledTimes(2);
  });

  it('uses saved dates for moves and retains the saved calendar after a background reload', () => {
    component.state.form.startDate='2026-11-14';
    component.state.form.durationDays=7;
    expect(component.state.dayForDate('2026-11-20')).toBe(8);
    expect(component.state.firstDate).toBe('2026-11-13');
    expect(component.state.lastDate).toBe('2026-12-03');
    api.moveWorkoutToDay.and.returnValue(of(undefined));
    component.workouts.moveDate='2026-11-20'; component.workouts.moveWorkout();
    expect(api.moveWorkoutToDay).toHaveBeenCalledOnceWith(11,8);
    expect(component.state.form.startDate).toBe('2026-11-14');
    expect(component.state.form.durationDays).toBe(7);
    expect(component.state.cells[0].date?.getDate()).toBe(13);
    expect(component.state.cells.length).toBe(21);
  });

  it('creates an empty-day workout on the saved date rather than an unsubmitted start date', () => {
    component.selectDay(2);
    component.state.form.startDate='2026-11-14';
    component.library.workoutName='New workout';
    component.library.pendingExercises=[{id:99,name:'Squat',muscleGroup:null,equipment:null}];
    api.createWorkout.and.returnValue(new Subject<number>());
    component.library.createWorkoutForDay();
    expect(api.createWorkout).toHaveBeenCalledOnceWith('New workout','2026-11-14');
  });

  for (const pending of ['savingDetails','savingClientWorkout','loading'] as const) {
    it(`blocks all program mutations during ${pending}`, () => {
      component.state[pending]=true;
      component.workouts.moveDate='2026-11-20'; component.workouts.extraDate='2026-11-21';
      component.workouts.moveWorkout(); component.workouts.removeWorkout();
      component.workouts.repeatWeekly(); component.workouts.addToAnotherDay();
      component.workouts.copyToLibrary();
      component.library.workoutName='Draft';
      component.library.pendingExercises=[{id:99,name:'Squat',muscleGroup:null,equipment:null}];
      component.library.copySourceId=20; component.library.multiSelected=[20];
      component.library.createWorkoutForDay(); component.library.copyWorkoutToDay();
      component.library.linkLibraryWorkout(); component.library.addMultiple(); component.library.openMulti();
      component.copy.copyName='Copy'; component.copy.copyStart='2026-11-20'; component.copy.confirmCopy();
      expect(component.library.multiOpen).toBeFalse();
      for (const method of ['moveWorkoutToDay','removeWorkoutFromDay','addWorkoutToDay','createWorkout',
        'copyWorkoutToDay','copyWorkout','copyProgram'] as const) {
        expect(api[method]).withContext(method).not.toHaveBeenCalled();
      }
    });
  }

  it('blocks a real second request until the metadata save and reload both finish', () => {
    const save=new Subject<void>();
    const reload=new Subject<CoachProgram>();
    api.updateProgram.and.returnValue(save);
    api.getProgram.and.returnValue(reload);
    component.details.saveDetails();
    component.workouts.moveDate='2026-11-20'; component.workouts.moveWorkout();
    expect(api.moveWorkoutToDay).not.toHaveBeenCalled();
    save.next(); save.complete();
    expect(component.state.loading).toBeTrue();
    component.workouts.moveWorkout();
    expect(api.moveWorkoutToDay).not.toHaveBeenCalled();
    reload.next(program); reload.complete();
    api.moveWorkoutToDay.and.returnValue(new Subject<void>());
    component.workouts.moveDate='2026-11-20'; component.workouts.moveWorkout();
    expect(api.moveWorkoutToDay).toHaveBeenCalledOnceWith(11,8);
  });

  it('keeps an empty-day draft and warns instead of opening or executing bulk add', () => {
    component.selectDay(2);
    component.library.workoutName='Unsaved workout';
    component.library.pendingExercises=[{id:99,name:'Squat',muscleGroup:null,equipment:null}];
    component.library.openMulti();
    expect(component.library.multiOpen).toBeFalse();
    expect(component.state.message).toBe('coachWorkspace.editor.saveBeforeBulkAdd');
    component.library.multiSelected=[20]; component.library.addMultiple();
    expect(api.addWorkoutToDay).not.toHaveBeenCalled();
    expect(component.library.workoutName).toBe('Unsaved workout');
    expect(component.library.pendingExercises[0].id).toBe(99);
  });

  it('allows bulk add after the user explicitly discards the draft', () => {
    component.selectDay(2); component.library.workoutName='Unsaved';
    component.selectDay(3);
    component.discardAndChangeDay();
    expect(component.library.hasDraft).toBeFalse();
    component.library.openMulti();
    expect(component.library.multiOpen).toBeTrue();
    component.library.multiSelected=[20]; api.addWorkoutToDay.and.returnValue(of(undefined));
    component.library.addMultiple();
    expect(api.addWorkoutToDay).toHaveBeenCalledOnceWith(10,20,3);
  });
});
