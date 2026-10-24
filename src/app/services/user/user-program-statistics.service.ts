import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { API_ENDPOINTS } from '../../api-endpoints';
import { ProgramStatistics } from '../../models/user-program-statistics.model';
import type { ApiResponse } from '../../models/backend-dto/common/api-response';
import type { ProgramStatisticsResponse } from '../../models/backend-dto/userprogramstatistics/program-statistics-response';

@Injectable({
  providedIn: 'root',
})
export class UserProgramStatisticsService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = API_ENDPOINTS.userProgramStatistics;

  /**
   * A bejelentkezett user programjainak összesített statisztikái.
   *
   * A user ID-t nem küldjük a backendnek.
   * A backend a bejelentkezett user alapján
   * határozza meg, hogy milyen adatok adhatók vissza.
   */
  getProgramStatistics(language: string): Observable<ApiResponse<ProgramStatistics>> {
    return this.http.get<ApiResponse<ProgramStatisticsResponse>>(this.apiUrl, {
      params: { language },
    }).pipe(
      map((response) => ({
        success: response.success,
        message: response.message,
        data: response.data
          ? {
              totalPrograms: response.data.totalPrograms ?? 0,
              completedPrograms: response.data.completedPrograms ?? 0,
              programs: (response.data.programs ?? [])
                .filter(
                  (
                    program,
                  ): program is typeof program & { programId: number } =>
                    program.programId != null,
                )
                .map((program) => ({
                  programId: program.programId,
                  programName: program.programName ?? '',
                  totalWorkouts: program.totalWorkouts ?? 0,
                  completedWorkouts: program.completedWorkouts ?? 0,
                  incompleteWorkouts: program.incompleteWorkouts ?? 0,
                  completed: program.completed ?? false,
                  exerciseStatistics: (program.exerciseStatistics ?? []).map(exercise => ({
                    exerciseId: exercise.exerciseId,
                    exerciseName: exercise.exerciseName,
                    planWeeks: (exercise.planWeeks ?? []).map(week => ({
                      ...week,
                      completionPercent: week.completionPercent == null ? null : Number(week.completionPercent),
                      targetVolumeKg: week.targetVolumeKg == null ? null : Number(week.targetVolumeKg),
                      actualVolumeKg: week.actualVolumeKg == null ? null : Number(week.actualVolumeKg),
                    })),
                    weeks: (exercise.weeks ?? []).map(week => ({
                      ...week,
                      metrics: week.metrics ? {
                        ...week.metrics,
                        estimatedOneRepMaxKg: week.metrics.estimatedOneRepMaxKg == null ? null : Number(week.metrics.estimatedOneRepMaxKg),
                        bestSingleKg: week.metrics.bestSingleKg == null ? null : Number(week.metrics.bestSingleKg),
                        referenceOneRepMaxKg: week.metrics.referenceOneRepMaxKg == null ? null : Number(week.metrics.referenceOneRepMaxKg),
                        relativeIntensityPercent: week.metrics.relativeIntensityPercent == null ? null : Number(week.metrics.relativeIntensityPercent),
                        topSetWeightKg: Number(week.metrics.topSetWeightKg),
                        targetVolumeKg: week.metrics.targetVolumeKg == null ? null : Number(week.metrics.targetVolumeKg),
                        averagePrescribedRestSeconds: week.metrics.averagePrescribedRestSeconds == null ? null : Number(week.metrics.averagePrescribedRestSeconds),
                      } : null,
                      volumeKg: Number(week.volumeKg),
                      maxWeightKg: Number(week.maxWeightKg),
                      volumeChangePercent: week.volumeChangePercent == null ? null : Number(week.volumeChangePercent),
                      maxWeightChangeKg: week.maxWeightChangeKg == null ? null : Number(week.maxWeightChangeKg),
                      maxWeightChangePercent: week.maxWeightChangePercent == null ? null : Number(week.maxWeightChangePercent),
                    })),
                  })),
                  weeklyVolumes: (program.weeklyVolumes ?? []).map(week => ({
                    week: week.week,
                    volumeKg: Number(week.volumeKg),
                    changePercent: week.changePercent == null ? null : Number(week.changePercent),
                    weekStart: week.weekStart ?? null,
                    futureWeek: week.futureWeek ?? false,
                    currentWeek: week.currentWeek ?? false,
                    completedSets: week.completedSets ?? null,
                    repetitions: week.repetitions ?? null,
                    plannedSets: week.plannedSets ?? null,
                    completedPlannedSets: week.completedPlannedSets ?? null,
                  })),
                })),
            }
          : null,
      })),
    );
  }
}
