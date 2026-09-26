import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { API_ENDPOINTS } from '../../../api-endpoints';
import { ApiResponse } from '../../../models/api-response.model';

interface RawWorkoutRecord extends Partial<Workout> {
  id?: number;
  workout_id?: number;
  program_workout_id?: number;
  user_workout_id?: number;
}

interface RawScheduledWorkout extends Partial<ScheduledWorkout> {
  user_workout_id?: number;
  program_workout_id?: number;
  workout_id?: number;
  program_id?: number;
  scheduled_at?: string | null;
  workout_name?: string | null;
}

export interface Workout {
  workoutId: number;
  workoutName: string;
  workoutDescription: string;
  workoutDate: string;
  durationMinutes: number;
  intensityLevel: string;
  dayIndex: number;
  programWorkoutId?: number;
  userWorkoutId?: number;
  completed: boolean | null;
  performedAt: string | null;
  actualSets: number | null;
  actualRepetitions: number | null;
  weightUsed: number | null;
  durationSeconds: number | null;
  feedback: string | null;
  notes: string | null;
}

export interface ScheduledWorkout {
  userWorkoutId: number;
  programWorkoutId: number;
  workoutId: number;
  programId: number;
  scheduledAt: string | null;
  completed: boolean | null;
  workoutName?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class UserWorkoutsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = API_ENDPOINTS.workouts;

  /** Backend hívás – Workouts by program */
  getWorkoutsByProgram(programId: number): Observable<Workout[]> {
    return this.http
      .get<ApiResponse<RawWorkoutRecord[]>>(API_ENDPOINTS.workoutsByProgram(programId))
      .pipe(
        map((response) =>
          (response.data ?? []).map((item) => ({
            workoutId: Number(item.workoutId ?? item.workout_id ?? item.id),
            workoutName: item.workoutName ?? '',
            workoutDescription: item.workoutDescription ?? '',
            workoutDate: item.workoutDate ?? '',
            durationMinutes: item.durationMinutes ?? 0,
            intensityLevel: item.intensityLevel ?? '',
            dayIndex: item.dayIndex ?? 0,
            programWorkoutId:
              item.programWorkoutId != null
                ? Number(item.programWorkoutId)
                : item.program_workout_id != null
                  ? Number(item.program_workout_id)
                  : undefined,
            userWorkoutId:
              item.userWorkoutId != null
                ? Number(item.userWorkoutId)
                : item.user_workout_id != null
                  ? Number(item.user_workout_id)
                  : undefined,
            completed: item.completed ?? null,
            performedAt: item.performedAt ?? null,
            actualSets: item.actualSets ?? null,
            actualRepetitions: item.actualRepetitions ?? null,
            weightUsed: item.weightUsed ?? null,
            durationSeconds: item.durationSeconds ?? null,
            feedback: item.feedback ?? null,
            notes: item.notes ?? null,
          })),
        ),
      );
  }

  /**
   * A konkrét USER_WORKOUT occurrence-ök lekérése.
   *
   * A program/workout páros önmagában nem egyedi az új backend modellben,
   * ezért az exercise oldalra navigálás előtt a konkrét userWorkoutId-t
   * használjuk.
   */
  getScheduledWorkouts(): Observable<ScheduledWorkout[]> {
    return this.http
       .get<ApiResponse<RawScheduledWorkout[]>>(
        API_ENDPOINTS.scheduledUserWorkouts,
      )
      .pipe(
        map((response) =>
          (response.data ?? [])
            .map((item): ScheduledWorkout | null => {
              const userWorkoutId = Number(
                item.user_workout_id ?? item.userWorkoutId,
              );
              const programWorkoutId = Number(
                item.programWorkoutId ?? item.program_workout_id,
              );
              const workoutId = Number(
                item.workoutId ?? item.workout_id,
              );
              const programId = Number(
                item.programId ?? item.program_id,
              );

              if (
                !Number.isFinite(userWorkoutId) || userWorkoutId <= 0 ||
                !Number.isFinite(programWorkoutId) || programWorkoutId <= 0 ||
                !Number.isFinite(workoutId) || workoutId <= 0 ||
                !Number.isFinite(programId) || programId <= 0
              ) {
                return null;
              }

              return {
                userWorkoutId,
                programWorkoutId,
                workoutId,
                programId,
                scheduledAt: item.scheduled_at ?? item.scheduledAt ?? null,
                completed: item.completed ?? null,
                workoutName: item.workout_name ?? item.workoutName ?? null,
              };
            })
            .filter((item): item is ScheduledWorkout => item !== null),
        ),
      );
  }
}
