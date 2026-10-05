import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import type { ApiResponse } from '../../models/backend-dto/common/api-response';
import type { ProgramWorkoutAssignmentDto } from '../../models/backend-dto/programs/program-workout-assignment-dto';
import type { ProgramWorkoutAssignmentRequest } from '../../models/backend-dto/programs/program-workout-assignment-request';
import type { ProgramWorkoutUpdateRequest } from '../../models/backend-dto/programs/program-workout-update-request';
import type { ProgramWorkoutAssignment } from '../../models/program-workout-assignment.model';
import { API_ENDPOINTS } from '../../api-endpoints';

@Injectable({
  providedIn: 'root',
})
export class ProgramWorkoutService {
  private readonly http = inject(HttpClient);

  addWorkoutToProgram(
    programId: number,
    workoutId: number,
    dayIndex: number = 1,
  ): Observable<ApiResponse<ProgramWorkoutAssignment>> {
    const payload: ProgramWorkoutAssignmentRequest = {
      programId,
      workoutId,
      dayIndex,
    };

    return this.http
      .post<ApiResponse<ProgramWorkoutAssignmentDto>>(
        API_ENDPOINTS.programWorkoutAdd,
        payload,
      )
      .pipe(map((response) => this.mapAssignmentResponse(response)));
  }

  isWorkoutAssignedToAnyProgram(
    workoutId: number,
  ): Observable<ApiResponse<{ assigned: boolean }>> {
    return this.http.get<ApiResponse<{ assigned: boolean }>>(
      API_ENDPOINTS.programWorkoutAssigned(workoutId),
    );
  }

  getWorkoutsForProgram(
    programId: number,
  ): Observable<ApiResponse<ProgramWorkoutAssignment[]>> {
    return this.http
      .get<ApiResponse<ProgramWorkoutAssignmentDto[]>>(
        API_ENDPOINTS.programWorkoutsByProgram(programId),
      )
      .pipe(
        map((response) => ({
          ...response,
          data: this.mapAssignments(response.data),
        })),
      );
  }

  deleteProgramWorkout(
    id: number,
  ): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(
      API_ENDPOINTS.programWorkoutDeleteById(id),
    );
  }

  deleteProgramWorkouts(programId: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(
      API_ENDPOINTS.programWorkoutsDelete(programId),
    );
  }

  updateProgramWorkout(
    id: number,
    dayIndex: number,
  ): Observable<ApiResponse<ProgramWorkoutAssignment>> {
    const payload: ProgramWorkoutUpdateRequest = {
      id,
      dayIndex,
    };

    return this.http
      .put<ApiResponse<ProgramWorkoutAssignmentDto>>(
        API_ENDPOINTS.programWorkoutUpdate(id),
        payload,
      )
      .pipe(map((response) => this.mapAssignmentResponse(response)));
  }

  private mapAssignmentResponse(
    response: ApiResponse<ProgramWorkoutAssignmentDto>,
  ): ApiResponse<ProgramWorkoutAssignment> {
    return {
      ...response,
      data: response.data == null ? null : this.mapAssignment(response.data),
    };
  }

  private mapAssignments(
    assignments: ProgramWorkoutAssignmentDto[] | null,
  ): ProgramWorkoutAssignment[] {
    return (assignments ?? [])
      .filter(this.hasCompleteAssignment)
      .map((assignment) => ({
        id: assignment.id,
        programId: assignment.programId,
        workoutId: assignment.workoutId,
        dayIndex: assignment.dayIndex,
      }));
  }

  private mapAssignment(
    assignment: ProgramWorkoutAssignmentDto,
  ): ProgramWorkoutAssignment {
    if (
      assignment.id == null ||
      assignment.programId == null ||
      assignment.workoutId == null ||
      assignment.dayIndex == null
    ) {
      throw new Error('Incomplete program-workout assignment received from backend.');
    }

    return {
      id: assignment.id,
      programId: assignment.programId,
      workoutId: assignment.workoutId,
      dayIndex: assignment.dayIndex,
    };
  }

  private hasCompleteAssignment(
    assignment: ProgramWorkoutAssignmentDto,
  ): assignment is ProgramWorkoutAssignmentDto & {
    id: number;
    programId: number;
    workoutId: number;
    dayIndex: number;
  } {
    return (
      assignment.id != null &&
      assignment.programId != null &&
      assignment.workoutId != null &&
      assignment.dayIndex != null
    );
  }
}
