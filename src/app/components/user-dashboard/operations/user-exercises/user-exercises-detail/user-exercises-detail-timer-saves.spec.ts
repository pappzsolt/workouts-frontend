import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { LoggerService } from '../../../../../services/logger.service';
import { UserExerciseDetailComponent } from './user-exercises-detail.component';
import type { ApiResponse } from '../../../../../models/backend-dto/common/api-response';
import type { UserWorkoutExerciseDetailDto, UserWorkoutExerciseSetDto } from '../../../../../models/user-workout-exercise-detail.dto';

describe('Rest timer after queued set saves', () => {
  let component: UserExerciseDetailComponent;
  let set: UserWorkoutExerciseSetDto;
  let requests: Subject<ApiResponse<void>>[];
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [{ provide: LoggerService, useValue: { error() {} } }] });
    requests = [];
    component = TestBed.runInInjectionContext(() => new UserExerciseDetailComponent({} as never, {
      updateSetCompleted: () => { const request = new Subject<ApiResponse<void>>(); requests.push(request); return request; },
    } as never, {} as never));
    component.userWorkoutId = 100; component.programId = 7; component.workoutId = 5;
    set = { id: 99, userWorkoutExerciseId: 1, setNumber: 1, completed: false, targetRepetitions: 10,
      targetWeightKg: 20, actualRepetitions: 10, actualWeightKg: 20, notes: '', startedAt: null, completedAt: null };
    component.workoutExercise = { exercise: { id: 6 }, userWorkoutExerciseSets: [set] } as UserWorkoutExerciseDetailDto;
  });
  afterEach(() => component.ngOnDestroy());
  function finish(index: number): void {
    requests[index].next({ success: true, data: null, message: null }); requests[index].complete();
  }

  it('shows the completed set timer after a changed weight save queues behind Done', () => {
    component.updateSetCompleted(set, true);
    set.actualWeightKg = 30;
    component.saveSetDetails(set, false);
    finish(0); finish(1);
    expect(component.restTimerSetId).toBe(99);
    expect(set.completed).toBeTrue();
  });

  it('preserves confirmed completion and shows its timer even if the queued detail save fails', () => {
    component.updateSetCompleted(set, true);
    set.notes = 'New note';
    component.saveSetDetails(set, false);
    finish(0); requests[1].error(new Error('offline'));
    expect(set.completed).toBeTrue();
    expect(component.restTimerSetId).toBe(99);
    expect(component.messageType).toBe('error');
  });

  it('does not show a timer if both completion and the queued detail write fail', () => {
    component.updateSetCompleted(set, true);
    set.notes = 'New note'; component.saveSetDetails(set, false);
    requests[0].error(new Error('offline')); requests[1].error(new Error('offline'));
    expect(set.completed).toBeFalse();
    expect(component.restTimerSetId).toBeNull();
  });

  it('does not refresh the timer for an ordinary detail save after completion is already confirmed', () => {
    component.updateSetCompleted(set, true); finish(0);
    const revision = component.restTimerRevision;
    set.notes = 'New note'; component.saveSetDetails(set, false); finish(1);
    expect(component.restTimerSetId).toBe(99);
    expect(component.restTimerRevision).toBe(revision);
  });

  it('clears the timer when undoing completion with a queued detail save', () => {
    component.updateSetCompleted(set, true); finish(0);
    component.updateSetCompleted(set, false);
    set.notes = 'Undone'; component.saveSetDetails(set, false);
    finish(1); finish(2);
    expect(set.completed).toBeFalse();
    expect(component.restTimerSetId).toBeNull();
  });

  it('does not apply old timer results to a different exercise', () => {
    component.updateSetCompleted(set, true);
    set.notes = 'New note'; component.saveSetDetails(set, false);
    component.workoutExercise = { exercise: { id: 8 }, userWorkoutExerciseSets: [] } as unknown as UserWorkoutExerciseDetailDto;
    finish(0); finish(1);
    expect(component.restTimerSetId).toBeNull();
  });
});
