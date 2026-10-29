import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import type { ClientProgramRow, ClientSetValues, ClientWorkoutExerciseRow, ClientWorkoutSet, CoachApplyTemplateResult, CoachClientWorkout, CoachProgramUsage, CoachExerciseFilterOptions, CoachExercisePage, CoachExerciseQuery, CoachOverview, CoachProgram, CoachProgramDayLink, CoachProgramDetailsInput, CoachWorkoutStatus, CoachWorkoutSummary } from '../../models/coach-workspace.model';
import { CoachClientsApiService } from './coach-clients-api.service';
import { CoachProgramsApiService } from './coach-programs-api.service';
import { CoachWorkoutTemplatesApiService } from './coach-workouts-api.service';
import { CoachExerciseCatalogueApiService } from './coach-catalogue-api.service';

export function workoutStatus(workout: CoachClientWorkout, today: string): CoachWorkoutStatus {
  if (workout.completed) return 'done';
  if (workout.startedAt) return 'inProgress';
  if (workout.scheduledAt < today) return 'missed';
  return 'planned';
}

/** Workspace facade: preserves the UI contract while domain APIs own HTTP behavior. */
@Injectable({ providedIn: 'root' })
export class CoachWorkspaceService {
  private readonly clients = inject(CoachClientsApiService);
  private readonly programs = inject(CoachProgramsApiService);
  private readonly workouts = inject(CoachWorkoutTemplatesApiService);
  private readonly catalogue = inject(CoachExerciseCatalogueApiService);

  getOverview(from: string, to: string, userId?: number): Observable<CoachOverview> {
    return this.clients.getOverview(from, to, userId);
  }

  assignProgram(userId: number, programId: number): Observable<string | null> {
    return this.programs.assignProgram(userId, programId);
  }

  revokeProgram(programId: number, userId: number): Observable<void> {
    return this.programs.revokeProgram(programId, userId);
  }

  getAssignedUserIds(programId: number): Observable<number[]> {
    return this.programs.getAssignedUserIds(programId);
  }

  rescheduleWorkout(userWorkoutId: number, scheduledAt: string): Observable<void> {
    return this.clients.rescheduleWorkout(userWorkoutId, scheduledAt);
  }

  getClientWorkoutExercises(userWorkoutId: number): Observable<ClientWorkoutExerciseRow[]> {
    return this.clients.getClientWorkoutExercises(userWorkoutId);
  }

  getClientWorkoutSets(userWorkoutExerciseId: number): Observable<ClientWorkoutSet[]> {
    return this.clients.getClientWorkoutSets(userWorkoutExerciseId);
  }

  updateClientSet(
    setId: number,
    values: { targetRepetitions: number; targetWeightKg: number | null; restSeconds: number },
  ): Observable<void> {
    return this.clients.updateClientSet(setId, values);
  }

  addClientSet(userWorkoutExerciseId: number): Observable<number> {
    return this.clients.addClientSet(userWorkoutExerciseId);
  }

  deleteClientSet(setId: number): Observable<void> {
    return this.clients.deleteClientSet(setId);
  }

  getClientProgramRows(userId: number, programId: number): Observable<ClientProgramRow[]> {
    return this.clients.getClientProgramRows(userId, programId);
  }

  exportClientProgram(userId: number, programId: number): Observable<Blob> {
    return this.clients.exportClientProgram(userId, programId);
  }

  saveClientSet(setId: number, values: ClientSetValues, expected?: ClientSetValues): Observable<void> {
    return this.clients.saveClientSet(setId, values, expected);
  }

  getCoachPrograms(): Observable<CoachProgram[]> {
    return this.programs.getCoachPrograms();
  }

  getProgram(programId: number): Observable<CoachProgram> {
    return this.programs.getProgram(programId);
  }

  createProgram(details: CoachProgramDetailsInput): Observable<number> {
    return this.programs.createProgram(details);
  }

  updateProgram(programId: number, details: CoachProgramDetailsInput): Observable<void> {
    return this.programs.updateProgram(programId, details);
  }

  deleteProgram(programId: number): Observable<void> {
    return this.programs.deleteProgram(programId);
  }

  getProgramDays(programId: number): Observable<CoachProgramDayLink[]> {
    return this.programs.getProgramDays(programId);
  }

  addWorkoutToDay(programId: number, workoutId: number, dayIndex: number): Observable<void> {
    return this.programs.addWorkoutToDay(programId, workoutId, dayIndex);
  }

  moveWorkoutToDay(programWorkoutId: number, dayIndex: number): Observable<void> {
    return this.programs.moveWorkoutToDay(programWorkoutId, dayIndex);
  }

  removeWorkoutFromDay(programWorkoutId: number): Observable<void> {
    return this.programs.removeWorkoutFromDay(programWorkoutId);
  }

  copyWorkoutToDay(
    sourceWorkoutId: number,
    programId: number,
    workoutName: string,
    workoutDate: string,
    dayIndex: number,
  ): Observable<number> {
    return this.workouts.copyWorkoutToDay(sourceWorkoutId, programId, workoutName, workoutDate, dayIndex);
  }

  createWorkout(name: string, workoutDate: string): Observable<number> {
    return this.workouts.createWorkout(name, workoutDate);
  }

  getMyWorkouts(): Observable<CoachWorkoutSummary[]> {
    return this.workouts.getMyWorkouts();
  }

  addExerciseToWorkout(workoutId: number, exerciseId: number): Observable<void> {
    return this.workouts.addExerciseToWorkout(workoutId, exerciseId);
  }

  updatePrescription(
    workoutId: number,
    exerciseId: number,
    values: { sets: number; repetitions: number; restSeconds: number },
  ): Observable<void> {
    return this.workouts.updatePrescription(workoutId, exerciseId, values);
  }

  copyProgram(programId: number, name: string, startDate: string, userId: number | null): Observable<number> {
    return this.programs.copyProgram(programId, name, startDate, userId);
  }

  copyWorkout(workoutId: number, name: string): Observable<number> {
    return this.workouts.copyWorkout(workoutId, name);
  }

  applyTemplate(workoutId: number): Observable<CoachApplyTemplateResult> {
    return this.workouts.applyTemplate(workoutId);
  }

  programsUsingWorkout(workoutId: number): Observable<CoachProgramUsage[]> {
    return this.workouts.programsUsingWorkout(workoutId);
  }

  assignmentCounts(): Observable<Record<number, number>> {
    return this.programs.assignmentCounts();
  }

  moveTemplateExercise(workoutId: number, exerciseId: number, orderIndex: number): Observable<void> {
    return this.workouts.moveTemplateExercise(workoutId, exerciseId, orderIndex);
  }

  browseExercises(query: CoachExerciseQuery): Observable<CoachExercisePage> {
    return this.catalogue.browseExercises(query);
  }

  getExerciseFilterOptions(): Observable<CoachExerciseFilterOptions> {
    return this.catalogue.getExerciseFilterOptions();
  }
}
