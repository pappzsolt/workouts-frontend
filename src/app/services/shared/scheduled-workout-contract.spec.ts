import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { API_ENDPOINTS } from '../../api-endpoints';
import type { ScheduledWorkout } from '../../models/scheduled-workout/scheduled-workout.model';
import { UserWorkoutsService } from '../user/user-workouts/user-workouts.service';
import { WorkoutExercisesManagerService } from '../user/workout-exercises-manager.service';
import { LanguageService } from './language.service';

for (const source of ['calendar', 'user'] as const) {
  describe(`${source} scheduled workout HTTP contract`, () => {
    let http: HttpTestingController;
    beforeEach(() => {
      TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(),
        { provide: LanguageService, useValue: { getCurrentLanguage: () => 'hu' } },
      ] });
      http = TestBed.inject(HttpTestingController);
    });
    afterEach(() => http.verify());

    function read(assert: (items: ScheduledWorkout[]) => void): void {
      if (source === 'calendar') {
        TestBed.inject(WorkoutExercisesManagerService).getScheduledWorkouts().subscribe(response => assert(response.data ?? []));
      } else {
        TestBed.inject(UserWorkoutsService).getScheduledWorkouts().subscribe(assert);
      }
    }

    function respond(data: unknown): void {
      const request = http.expectOne(req => req.url === API_ENDPOINTS.scheduledUserWorkouts);
      expect(request.request.method).toBe('GET');
      expect(request.request.params.get('language')).toBe('hu');
      request.flush({ success: true, message: 'Loaded', data });
    }

    it('retains its existing precedence when both field spellings disagree', () => {
      read(items => expect(items).toEqual([{
        userWorkoutId: source === 'calendar' ? 11 : 12,
        programWorkoutId: 21, workoutId: 31, programId: 41,
        scheduledAt: source === 'calendar' ? '2030-01-01' : '2030-01-02',
        workoutName: source === 'calendar' ? 'Camel name' : 'Snake name', completed: false,
      }]));
      respond([{
        userWorkoutId: 11, user_workout_id: 12, programWorkoutId: 21, program_workout_id: 22,
        workoutId: 31, workout_id: 32, programId: 41, program_id: 42,
        scheduledAt: '2030-01-01', scheduled_at: '2030-01-02',
        workoutName: 'Camel name', workout_name: 'Snake name', completed: false,
      }]);
    });

    it('accepts snake-only and camel-only records in their original order', () => {
      read(items => {
        expect(items.map(item => item.userWorkoutId)).toEqual([1, 5]);
        expect(items.map(item => item.completed)).toEqual([true, null]);
        expect(items[1].scheduledAt).toBeNull();
        expect(items[1].workoutName).toBeNull();
      });
      respond([
        { user_workout_id: 1, program_workout_id: 2, workout_id: 3, program_id: 4, completed: true },
        { userWorkoutId: 5, programWorkoutId: 6, workoutId: 7, programId: 8 },
      ]);
    });

    it('keeps empty preferred strings instead of falling back to the alternate spelling', () => {
      read(items => {
        expect(items[0].scheduledAt).toBe('');
        expect(items[0].workoutName).toBe('');
      });
      respond([{
        userWorkoutId: 1, programWorkoutId: 2, workoutId: 3, programId: 4,
        ...(source === 'calendar'
          ? { scheduledAt: '', scheduled_at: '2030-01-01', workoutName: '', workout_name: 'Alternate' }
          : { scheduledAt: '2030-01-01', scheduled_at: '', workoutName: 'Alternate', workout_name: '' }),
      }]);
    });

    for (const field of ['userWorkoutId', 'programWorkoutId', 'workoutId', 'programId']) {
      it(`rejects missing, nonpositive and nonnumeric ${field} without changing the numeric acceptance rule`, () => {
        read(items => expect(items.map(item => item.userWorkoutId)).toEqual([1.5]));
        const valid = { userWorkoutId: 1.5, programWorkoutId: 2, workoutId: 3, programId: 4 };
        respond([undefined, null, 0, -1, 'invalid', 'Infinity'].map(value => ({ ...valid, [field]: value })).concat([valid]));
      });
    }

    it('does not fall back to an alternate occurrence ID when the preferred ID is zero', () => {
      read(items => expect(items).toEqual([]));
      respond([{
        userWorkoutId: source === 'calendar' ? 0 : 99,
        user_workout_id: source === 'calendar' ? 99 : 0,
        programWorkoutId: 2, workoutId: 3, programId: 4,
      }]);
    });

    it('keeps an empty response empty', () => {
      read(items => expect(items).toEqual([]));
      respond(null);
    });
  });
}

describe('Calendar scheduled workout response envelope', () => {
  it('retains the success flag and backend message while mapping data', () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(),
      { provide: LanguageService, useValue: { getCurrentLanguage: () => 'en' } },
    ] });
    TestBed.inject(WorkoutExercisesManagerService).getScheduledWorkouts().subscribe(response => {
      expect(response).toEqual({ success: false, message: 'Denied', data: [] });
    });
    const http = TestBed.inject(HttpTestingController);
    const request = http.expectOne(req => req.url === API_ENDPOINTS.scheduledUserWorkouts);
    expect(request.request.params.get('language')).toBe('en');
    request.flush({ success: false, message: 'Denied', data: null });
    http.verify();
  });
});
