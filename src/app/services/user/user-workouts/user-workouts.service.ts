import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { API_ENDPOINTS } from '../../../api-endpoints';
import { ApiResponse } from '../../../models/api-response.model';

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
      .get<ApiResponse<Workout[]>>(`${this.apiUrl}/program/${programId}`)
      .pipe(
        map((response) =>
          (response.data ?? []).map((item: any) => ({
            ...item,
            workoutId: Number(item.workoutId ?? item.workout_id ?? item.id),
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
      .get<ApiResponse<ScheduledWorkout[]>>(
        `${API_ENDPOINTS.userWorkoutExercises}/scheduled-workouts`,
      )
      .pipe(
        map((response) =>
          (response.data ?? []).map((item: any) => {
            const programWorkoutId = Number(
              item.programWorkoutId ?? item.program_workout_id,
            );

            if (!Number.isFinite(programWorkoutId) || programWorkoutId <= 0) {
              throw new Error(
                'A scheduled workout válaszban hiányzik az érvényes programWorkoutId.',
              );
            }

            return {
              userWorkoutId: Number(
                item.user_workout_id ?? item.userWorkoutId,
              ),
              programWorkoutId,
              workoutId:
                item.workoutId != null
                  ? Number(item.workoutId)
                  : item.workout_id != null
                    ? Number(item.workout_id)
                    : 0,
              programId:
                item.programId != null
                  ? Number(item.programId)
                  : item.program_id != null
                    ? Number(item.program_id)
                    : 0,
              scheduledAt: item.scheduled_at ?? item.scheduledAt ?? null,
              completed: item.completed ?? null,
              workoutName: item.workout_name ?? item.workoutName ?? null,
            };
          }),
        ),
      );
  }
}
