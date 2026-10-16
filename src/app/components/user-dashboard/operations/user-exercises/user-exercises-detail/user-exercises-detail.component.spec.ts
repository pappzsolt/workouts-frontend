import { UserExerciseDetailComponent } from './user-exercises-detail.component';
import { Subject } from 'rxjs';
import type { UserWorkoutExerciseDetailDto } from '../../../../../models/user-workout-exercise-detail.dto';

describe('UserExerciseDetailComponent prescription summary', () => {
  let component: UserExerciseDetailComponent;

  beforeEach(() => {
    component = Object.create(UserExerciseDetailComponent.prototype);
  });

  function prescribe(repetitions: Array<number | null>): void {
    component.workoutExercise = {
      sets: 3,
      repetitions: 10,
      userWorkoutExerciseSets: repetitions.map(targetRepetitions => ({ targetRepetitions })),
    } as UserWorkoutExerciseDetailDto;
  }

  it('uses the execution sets instead of the generic 3 × 10 prescription', () => {
    prescribe([12, 12, 12, 12]);
    expect(component.prescribedSetCount).toBe(4);
    expect(component.prescribedRepetitions).toBe('12');
  });

  it('preserves each set target and its order when repetitions differ', () => {
    prescribe([12, 10, 8, 10]);
    expect(component.prescribedRepetitions).toBe('12 / 10 / 8 / 10');
  });

  it('does not replace missing targets or zero with generic repetitions', () => {
    prescribe([null, 0, 8]);
    expect(component.prescribedRepetitions).toBe('- / 0 / 8');
  });

  it('shows no prescription when there are no execution sets', () => {
    prescribe([]);
    expect(component.prescribedSetCount).toBe(0);
    expect(component.prescribedRepetitions).toBe('-');
  });
});


describe('UserExerciseDetailComponent rest timer navigation', () => {
  let component: UserExerciseDetailComponent;
  let navigatedTo: number | undefined;

  beforeEach(() => {
    component = Object.create(UserExerciseDetailComponent.prototype);
    component.currentSetIndex = 0;
    component.restTimerSetId = 101;
    component.workoutExercise = {
      userWorkoutExerciseSets: [
        { id: 101, completed: true },
        { id: 102, completed: false },
      ],
    } as UserWorkoutExerciseDetailDto;
    navigatedTo = undefined;
    component.goToSet = (index: number) => { navigatedTo = index; };
  });

  it('moves to the next set after the current set rest expires', () => {
    component.onRestFinished(101);
    expect(navigatedTo).toBe(1);
  });

  it('does not move when the user already selected another set', () => {
    component.currentSetIndex = 1;
    component.onRestFinished(101);
    expect(navigatedTo).toBeUndefined();
  });

  it('preserves manually selected earlier sets when a timer expires', () => {
    component.workoutExercise!.userWorkoutExerciseSets.unshift({ id: 100, completed: true } as any);
    component.currentSetIndex = 0;
    component.onRestFinished(101);
    expect(navigatedTo).toBeUndefined();
  });

  it('ignores obsolete timer events and unfinished sets', () => {
    component.onRestFinished(100);
    expect(navigatedTo).toBeUndefined();
    component.workoutExercise!.userWorkoutExerciseSets[0].completed = false;
    component.onRestFinished(101);
    expect(navigatedTo).toBeUndefined();
  });

  it('stays on the final set when there is no next set', () => {
    component.currentSetIndex = 1;
    component.restTimerSetId = 102;
    component.workoutExercise!.userWorkoutExerciseSets[1].completed = true;
    component.onRestFinished(102);
    expect(navigatedTo).toBeUndefined();
  });
});

describe('UserExerciseDetailComponent persisted rest timer selection', () => {
  let component: UserExerciseDetailComponent;

  beforeEach(() => {
    component = Object.create(UserExerciseDetailComponent.prototype);
    component.restTimerRevision = 0;
    component.workoutExercise = {
      userWorkoutExerciseSets: [
        { id: 101, completed: true, completedAt: '2026-10-16T10:03:00Z' },
        { id: 102, completed: true, completedAt: '2026-10-16T10:01:00Z' },
        { id: 103, completed: true, completedAt: '2026-10-16T10:02:00Z' },
      ],
    } as UserWorkoutExerciseDetailDto;
  });

  it('uses the newest completion time, not the final completed set in display order', () => {
    component['selectLastCompletedTimer']();
    expect(component.restTimerSetId).toBe(101);
  });

  it('uses the successfully edited set when selected explicitly', () => {
    component['selectLastCompletedTimer'](102);
    expect(component.restTimerSetId).toBe(102);
  });

  it('does not guess a timer when there are no valid completion timestamps', () => {
    for (const set of component.workoutExercise!.userWorkoutExerciseSets) set.completedAt = null;
    component['selectLastCompletedTimer']();
    expect(component.restTimerSetId).toBeNull();
  });
});


describe('UserExerciseDetailComponent queued save regression', () => {
  it('runs a newer completion edit after an earlier HTTP failure without reverting the newer UI state', () => {
    const component = Object.create(UserExerciseDetailComponent.prototype) as UserExerciseDetailComponent;
    const firstResponse = new Subject<any>();
    const secondResponse = new Subject<any>();
    const updateSetCompleted = jasmine.createSpy('updateSetCompleted')
      .and.returnValues(firstResponse.asObservable(), secondResponse.asObservable());
    const set = { id: 101, setNumber: 1, completed: false, completedAt: null } as any;
    const exercise = { exercise: { id: 55 }, userWorkoutExerciseSets: [set], done: false } as any;
    component.workoutExercise = exercise;
    component.userWorkoutId = 77;
    component.programId = 10;
    component.workoutId = 20;
    component.restTimerRevision = 0;
    (component as any).validateInputs = () => true;
    (component as any).pendingSetSaves = new Map();
    (component as any).exercisesService = { updateSetCompleted };

    const earlierErrors: unknown[] = [];
    const laterErrors: unknown[] = [];
    (component as any).createSetSaveRequest(set, true, true)
      .subscribe({ error: (error: unknown) => earlierErrors.push(error) });
    (component as any).createSetSaveRequest(set, true, false)
      .subscribe({ error: (error: unknown) => laterErrors.push(error) });

    expect(updateSetCompleted).toHaveBeenCalledTimes(1);
    expect(set.completed).toBe(false);
    firstResponse.error(new Error('First request failed'));
    expect(earlierErrors.length).toBe(1);
    expect(updateSetCompleted).toHaveBeenCalledTimes(2);
    expect(set.completed).toBe(false);

    secondResponse.next({ success: true, data: null, message: null });
    secondResponse.complete();
    expect(laterErrors).toEqual([]);
    expect(set.completed).toBe(false);
    expect(component.messageType).toBe('success');
    expect((component as any).pendingSetSaves.size).toBe(0);
  });
});

describe('UserExerciseDetailComponent reload timer regression', () => {
  it('selects the most recently completed set from the loaded backend response, regardless of list order', () => {
    const component = Object.create(UserExerciseDetailComponent.prototype) as UserExerciseDetailComponent;
    component.currentSetIndex = 0;
    component.restTimerRevision = 0;
    const exercise = {
      exercise: { id: 55 },
      done: false,
      userWorkoutExerciseSets: [
        { id: 101, completed: true, completedAt: '2026-10-16T10:03:00Z' },
        { id: 102, completed: true, completedAt: '2026-10-16T10:01:00Z' },
        { id: 103, completed: true, completedAt: '2026-10-16T10:02:00Z' },
      ],
    } as any;
    (component as any).applyExerciseDetailResponse(
      { success: true, data: { id: 20, exercises: [exercise] }, message: null } as any,
      55,
    );
    expect(component.workoutExercise).toBe(exercise);
    expect(component.restTimerSetId).toBe(101);
    expect(component.restTimerRevision).toBe(1);
  });
});
