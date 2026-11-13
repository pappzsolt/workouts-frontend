import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { of, Subject, throwError } from 'rxjs';
import { CoachWorkspaceService } from '../../../services/coach/coach-workspace.service';
import { CoachProgramEditorComponent } from './coach-program-editor.component';
import { ProgramClientCalendarComponent } from './parts/program-client-calendar.component';
import type { CoachClientOverview, CoachProgram, ClientProgramRow } from '../../../models/coach-workspace.model';

const athlete: CoachClientOverview = { userId:7,username:'Andi',email:'andi@example.com',age:null,weight:null,height:null,gender:null,goals:null,lastCompletedAt:null,programs:[],workouts:[] };
const program: CoachProgram = {programId:10,programName:'Program',programDescription:'',durationDays:21,difficultyLevel:'BEGINNER',startDate:'2026-11-13',endDate:'2026-12-03',workouts:[{programWorkoutId:11,workoutId:20,name:'Workout',description:'',exercises:[]}]};
const row: ClientProgramRow = {user_workout_id:101,workout_id:20,program_workout_id:11,program_day_index:1,workout_name:'Workout',scheduled_date:'2026-11-13',workout_exercise_id:1,user_workout_exercise_id:1,exercise_id:1,exercise_name:'Squat',exercise_order:0,exercise_completed:false,workout_completed:false,sets_done:3};

describe('Client operation and assignment safety',()=>{
  let api:jasmine.SpyObj<CoachWorkspaceService>;
  beforeEach(()=>{
    api=jasmine.createSpyObj('workspace',['getProgram','getProgramDays','getOverview','getAssignedUserIds','getMyWorkouts','getClientProgramRows','rescheduleWorkout','updateProgram','assignProgram']);
    api.getProgram.and.returnValue(of(program));api.getProgramDays.and.returnValue(of([{id:11,programId:10,workoutId:20,dayIndex:1}]));
    api.getOverview.and.returnValue(of({from:'',to:'',clients:[athlete]}));api.getAssignedUserIds.and.returnValue(of([7]));
    api.getMyWorkouts.and.returnValue(of([]));api.getClientProgramRows.and.returnValue(of([row]));
    TestBed.configureTestingModule({imports:[CoachProgramEditorComponent],providers:[provideRouter([]),provideTranslateService(),
      {provide:CoachWorkspaceService,useValue:api},
      {provide:ActivatedRoute,useValue:{paramMap:of(convertToParamMap({id:'10'})),snapshot:{queryParamMap:convertToParamMap({})}}},
    ]});
  });
  function renderClient() {
    const fixture=TestBed.createComponent(CoachProgramEditorComponent);fixture.detectChanges();
    const parent=fixture.componentInstance;
    parent.assignments.calendarUserId=7;parent.selectTab('calendar');fixture.detectChanges();
    const child=fixture.debugElement.query(By.directive(ProgramClientCalendarComponent)).componentInstance as ProgramClientCalendarComponent;
    return {fixture,parent,child};
  }

  it('blocks metadata saves, tab changes and leaving until a client move finishes',()=>{
    const moving=new Subject<void>();api.rescheduleWorkout.and.returnValue(moving);
    const {fixture,parent,child}=renderClient();
    child.moveDates[101]='2026-11-14';child.moveWorkout(child.workouts[0]);fixture.detectChanges();
    expect(parent.state.operationPending).toBeTrue();expect(parent.canLeave()).toBeFalse();
    parent.details.saveDetails();expect(api.updateProgram).not.toHaveBeenCalled();
    parent.selectTab('clients');expect(parent.activeTab).toBe('calendar');
    const unload={preventDefault:jasmine.createSpy('preventDefault'),returnValue:''} as unknown as BeforeUnloadEvent;
    parent.beforeUnload(unload);expect(unload.preventDefault).toHaveBeenCalled();
    expect(api.getClientProgramRows).toHaveBeenCalledTimes(1);
    moving.next();moving.complete();fixture.detectChanges();
    expect(parent.state.savingClientWorkout).toBeFalse();expect(parent.canLeave()).toBeTrue();
    expect(child.selectedDate).toBe('2026-11-14');
    parent.selectTab('clients');expect(parent.activeTab).toBe('clients');
  });

  it('unlocks the editor after a failed client move and preserves the original date',()=>{
    const moving=new Subject<void>();api.rescheduleWorkout.and.returnValue(moving);
    const {fixture,parent,child}=renderClient();
    child.moveDates[101]='2026-11-14';child.moveWorkout(child.workouts[0]);fixture.detectChanges();
    moving.error(new Error('Conflict'));fixture.detectChanges();
    expect(parent.state.operationPending).toBeFalse();expect(parent.canLeave()).toBeTrue();
    expect(child.selectedDate).toBe('2026-11-13');expect(child.moveDates[101]).toBe('2026-11-14');
    expect(child.canMove(child.workouts[0])).toBeTrue();
  });

  it('blocks client moves during a metadata save without reloading on busy-only input changes',()=>{
    const saving=new Subject<void>();api.updateProgram.and.returnValue(saving);
    const {fixture,parent,child}=renderClient();
    parent.details.saveDetails();fixture.detectChanges();
    expect(child.busy).toBeTrue();expect(api.getClientProgramRows).toHaveBeenCalledTimes(1);
    child.moveDates[101]='2026-11-14';child.moveWorkout(child.workouts[0]);
    expect(api.rescheduleWorkout).not.toHaveBeenCalled();
    saving.error(new Error('Offline'));fixture.detectChanges();
    expect(child.busy).toBeFalse();expect(api.getClientProgramRows).toHaveBeenCalledTimes(1);
  });

  it('shows an initial assignment fetch failure instead of an empty roster and supports retry',()=>{
    api.getAssignedUserIds.and.returnValue(throwError(()=>new Error('Network')));
    const fixture=TestBed.createComponent(CoachProgramEditorComponent);fixture.detectChanges();
    const parent=fixture.componentInstance;
    expect(parent.assignments.loaded).toBeFalse();expect(parent.assignments.loadFailed).toBeTrue();
    const element=fixture.nativeElement as HTMLElement;
    expect(element.querySelector('[role="alert"]')!.textContent).toContain('coachWorkspace.editor.assignmentLoadError');
    expect(element.querySelector('app-program-clients-panel')).toBeNull();
    api.getAssignedUserIds.and.returnValue(of([7]));
    element.querySelector<HTMLButtonElement>('[role="alert"] button')!.click();fixture.detectChanges();
    expect(parent.assignments.loaded).toBeTrue();expect(parent.assignments.loadFailed).toBeFalse();
    expect(parent.assignments.assignedClients.map(client=>client.userId)).toEqual([7]);
  });

  it('retains confirmed assignments and exposes a failed post-save refresh without duplicate writes',()=>{
    api.getAssignedUserIds.and.returnValue(of([]));
    const fixture=TestBed.createComponent(CoachProgramEditorComponent);fixture.detectChanges();
    const parent=fixture.componentInstance;
    parent.assignments.toggleAssign(7,true);api.assignProgram.and.returnValue(of(null));
    api.getAssignedUserIds.and.returnValue(throwError(()=>new Error('Network')));
    parent.assignments.assignSelected();fixture.detectChanges();
    expect(parent.state.message).toBe('coachWorkspace.editor.assigned');
    expect(parent.assignments.assignedIds.has(7)).toBeTrue();
    expect(parent.assignments.assignedClients.map(client=>client.userId)).toEqual([7]);
    expect(parent.assignments.unassignedClients).toEqual([]);expect(parent.assignments.loadFailed).toBeTrue();
    expect((fixture.nativeElement as HTMLElement).querySelector('[role="alert"]')).not.toBeNull();
    parent.assignments.toggleAssign(7,true);parent.assignments.assignSelected();
    expect(api.assignProgram).toHaveBeenCalledOnceWith(7,10);
  });
});
