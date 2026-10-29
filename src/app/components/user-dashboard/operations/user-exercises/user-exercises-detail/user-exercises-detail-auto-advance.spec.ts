import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { LoggerService } from '../../../../../services/logger.service';
import type { ApiResponse } from '../../../../../models/backend-dto/common/api-response';
import type { UserWorkoutExerciseDetailDto, UserWorkoutExerciseSetDto } from '../../../../../models/user-workout-exercise-detail.dto';
import { UserExerciseDetailComponent } from './user-exercises-detail.component';

describe('Automatic navigation after completing an exercise', () => {
  let component: UserExerciseDetailComponent;
  let navigate: jasmine.Spy;
  let requests: Subject<ApiResponse<void>>[];
  let sets: UserWorkoutExerciseSetDto[];

  beforeEach(() => {
    navigate = jasmine.createSpy('navigate').and.resolveTo(true);
    TestBed.configureTestingModule({ providers: [
      { provide: Router, useValue: { navigate } },
      { provide: LoggerService, useValue: { error() {} } },
    ] });
    requests = [];
    component = TestBed.runInInjectionContext(() => new UserExerciseDetailComponent({} as never, {
      updateSetCompleted: () => {
        const request = new Subject<ApiResponse<void>>(); requests.push(request); return request;
      },
    } as never, {} as never));
    component.workoutId = 5; component.programId = 7; component.userWorkoutId = 100;
    sets = Array.from({ length: 4 }, (_, i) => ({
      id: i + 1, userWorkoutExerciseId: 10, setNumber: i + 1,
      completed: i < 3, targetRepetitions: 10, targetWeightKg: 20,
      actualRepetitions: 10, actualWeightKg: 20, notes: null, startedAt: null, completedAt: null,
    }));
    component.workoutExercise = { exercise: { id: 6 }, userWorkoutExerciseSets: sets } as UserWorkoutExerciseDetailDto;
    component.workout = { id: 5, name: '', description: '', exercises: [
      component.workoutExercise,
      { exercise: { id: 8 }, userWorkoutExerciseSets: [] } as unknown as UserWorkoutExerciseDetailDto,
    ] };
  });
  afterEach(() => component.ngOnDestroy());

  function finish(index = 0): void {
    requests[index].next({ success: true, data: null, message: null }); requests[index].complete();
  }

  it('advances only after the fourth completed set has been saved, preserving query parameters', () => {
    component.updateSetCompleted(sets[3], true);
    expect(navigate).not.toHaveBeenCalled();
    finish();
    expect(navigate).toHaveBeenCalledOnceWith(['/user/workouts', 5, 'exercises', 8], { queryParamsHandling: 'merge' });
  });

  it('stays in a completed workout after editing set details', () => {
    component.workout!.completed = true;
    sets[3].completed = true;
    sets[3].actualWeightKg = 30;
    component.saveSetDetails(sets[3], false); finish();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('stays in a completed workout after unchecking and completing a set again', () => {
    component.workout!.completed = true;
    sets[3].completed = true;
    component.updateSetCompleted(sets[3], false); finish();
    component.updateSetCompleted(sets[3], true); finish(1);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('advances in an unfinished workout', () => {
    component.workout!.completed = false;
    component.updateSetCompleted(sets[3], true); finish();
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it('stays when any other set is unfinished', () => {
    sets[0].completed = false;
    component.updateSetCompleted(sets[3], true); finish();
    expect(navigate).not.toHaveBeenCalled();
  });

  for (const field of ['actualRepetitions', 'actualWeightKg'] as const) {
    it(`waits for missing ${field} and advances after it is saved`, () => {
      sets[3][field] = null;
      component.updateSetCompleted(sets[3], true); finish();
      expect(navigate).not.toHaveBeenCalled();
      sets[3][field] = 10;
      component.saveSetDetails(sets[3], false); finish(1);
      expect(navigate).toHaveBeenCalledTimes(1);
    });
  }

  it('accepts zero weight and empty optional effort and notes', () => {
    sets.forEach(set => set.actualWeightKg = 0);
    component.updateSetCompleted(sets[3], true); finish();
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it('stays when completion fails', () => {
    component.updateSetCompleted(sets[3], true);
    requests[0].error(new Error('offline'));
    expect(navigate).not.toHaveBeenCalled();
    expect(sets[3].completed).toBeFalse();
  });

  it('waits for queued edits and stays if the latest edit fails', () => {
    component.updateSetCompleted(sets[3], true);
    sets[3].actualWeightKg = 30; component.saveSetDetails(sets[3], false);
    finish();
    expect(navigate).not.toHaveBeenCalled();
    requests[1].error(new Error('offline'));
    component.saveSetDetails(sets[0], false); finish(2);
    expect(navigate).not.toHaveBeenCalled();
    component.saveSetDetails(sets[3], false); finish(3);
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it('advances once after all concurrent set saves have finished', () => {
    sets[0].completed = false;
    component.updateSetCompleted(sets[0], true);
    component.updateSetCompleted(sets[3], true);
    finish(); expect(navigate).not.toHaveBeenCalled();
    finish(1); expect(navigate).toHaveBeenCalledTimes(1);
    component.saveSetDetails(sets[3], false); finish(2);
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it('stays on the last exercise', () => {
    component.workout!.exercises.pop();
    component.updateSetCompleted(sets[3], true); finish();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('does not navigate when an old save finishes after manual exercise navigation', () => {
    component.updateSetCompleted(sets[3], true);
    component.workoutExercise = component.workout!.exercises[1];
    finish(); expect(navigate).not.toHaveBeenCalled();
  });

  it('does not navigate after the component is destroyed', () => {
    component.updateSetCompleted(sets[3], true);
    component.ngOnDestroy(); finish();
    expect(navigate).not.toHaveBeenCalled();
  });
});
