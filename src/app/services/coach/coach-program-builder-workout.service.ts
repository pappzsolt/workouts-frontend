import { Injectable } from '@angular/core';
import { Observable, of, from } from 'rxjs';
import { catchError, concatMap, map, toArray } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiResponse } from '../../models/backend-dto/common/api-response';
import { Exercise, WorkoutWithExercises } from '../../models/exercise.model';
import type { ProgramWorkoutAssignment } from '../../models/program-workout-assignment.model';
import { ExerciseService } from './coach-exercises/coach-exercises.service';
import { CoachWorkoutsService } from './coach-workouts/coach-workouts.service';
import { ProgramWorkoutService } from './program-workout.service';
import { WorkoutExerciseService } from './workout-exercises.service';
import { WorkoutCopyService } from './workout-copy.service';
import { ProgramWorkoutState } from '../../models/program-workout-state';
import type { WorkoutCopyRequest } from '../../models/backend-dto/workout/workout-copy-request';


export interface ProgramBuilderWorkoutLoad {
  programWorkouts: ProgramWorkoutAssignment[];
  allWorkouts: WorkoutWithExercises[];
  state: ProgramWorkoutState;
}

@Injectable({
  providedIn: 'root',
})
export class CoachProgramBuilderWorkoutService {
  constructor(
    private readonly exerciseService: ExerciseService,
    private readonly coachWorkoutsService: CoachWorkoutsService,
    private readonly programWorkoutService: ProgramWorkoutService,
    private readonly workoutExerciseService: WorkoutExerciseService,
    private readonly workoutCopyService: WorkoutCopyService,
  ) {}

  copyWorkout(request: WorkoutCopyRequest): Observable<ApiResponse<number>> {
    return this.workoutCopyService.copyWorkout(request);
  }

  loadWorkouts(): Observable<ApiResponse<WorkoutWithExercises[]>> {
    return this.coachWorkoutsService.getUniqueWorkoutsWithExercises();
  }

  loadExercises(): Observable<ApiResponse<Exercise[]>> {
    return this.exerciseService.getAllExercises();
  }

  loadProgramWorkouts(programId: number): Observable<ProgramBuilderWorkoutLoad> {
    return this.programWorkoutService.getWorkoutsForProgram(programId).pipe(
      map((response: ApiResponse<ProgramWorkoutAssignment[]>) => {
        if (!response.success || !Array.isArray(response.data)) {
          throw new Error(response.message || 'Failed to load program workouts.');
        }
        return { programWorkouts: [...(response.data ?? [])].sort(
          (a, b) => a.dayIndex - b.dayIndex,
        ),
      }; }),
      // Keep the two backend reads in one operation so the component only
      // coordinates state and UI messages.
      concatMap(({ programWorkouts }) =>
        this.exerciseService.getWorkoutsWithExercises().pipe(
          map((response: ApiResponse<WorkoutWithExercises[]>) => {
            if (!response.success || !Array.isArray(response.data)) {
              throw new Error(response.message || 'Failed to load workouts.');
            }
            const state = new ProgramWorkoutState();
            state.load(programWorkouts, response.data);
            return { programWorkouts, allWorkouts: response.data, state };
          }),
        ),
      ),
    );
  }

  getWorkoutExercises(workoutId: number): Observable<WorkoutWithExercises> {
    return this.exerciseService.getWorkoutExercises(workoutId);
  }

  saveExercises(
    workoutId: number,
    exercises: Exercise[],
    existingExerciseIds: Set<number>,
  ): Observable<{
    results: ApiResponse<void>[];
    workout: WorkoutWithExercises;
  }> {
    const newExercises = exercises.filter(
      (exercise): exercise is Exercise & { id: number } =>
        exercise.id != null && !existingExerciseIds.has(exercise.id),
    );

    if (newExercises.length === 0) {
      return this.getWorkoutExercises(workoutId).pipe(
        map((workout) => ({ results: [], workout })),
      );
    }

    return from(newExercises).pipe(
      concatMap((exercise) =>
        this.workoutExerciseService
          .assignExerciseToWorkout(workoutId, exercise.id)
          .pipe(
            catchError((error: HttpErrorResponse) =>
              of({
                success: false,
                data: null,
                message:
                  error?.error?.message ||
                  'coachProgramBuilder.saveExerciseError',
              } satisfies ApiResponse<void>),
            ),
          ),
      ),
      toArray(),
      concatMap((results: ApiResponse<void>[]) =>
        this.getWorkoutExercises(workoutId).pipe(
          map((workout) => ({ results, workout })),
        ),
      ),
    );
  }

  addWorkout(
    programId: number,
    workoutId: number,
    dayIndex: number,
  ): Observable<ApiResponse<ProgramWorkoutAssignment>> {
    return this.programWorkoutService.addWorkoutToProgram(
      programId,
      workoutId,
      dayIndex,
    );
  }

  addWorkouts(programId: number, workoutIds: number[], startDayIndex: number):
    Observable<ApiResponse<ProgramWorkoutAssignment>[]> {
    return from(workoutIds).pipe(
      concatMap((workoutId, index) => this.addWorkout(programId, workoutId, startDayIndex + index).pipe(
        catchError((error: HttpErrorResponse) => of({
          success: false, data: null,
          message: error?.error?.message || 'coachProgramBuilder.addWorkoutError',
        } satisfies ApiResponse<ProgramWorkoutAssignment>)),
      )),
      toArray(),
    );
  }

  removeWorkout(
    programWorkoutId: number,
  ): Observable<ApiResponse<void>> {
    return this.programWorkoutService.deleteProgramWorkout(
      programWorkoutId,
    );
  }

  updateWorkoutDay(
    programWorkoutId: number,
    dayIndex: number,
  ): Observable<ApiResponse<ProgramWorkoutAssignment>> {
    return this.programWorkoutService.updateProgramWorkout(
      programWorkoutId,
      dayIndex,
    );
  }
}
