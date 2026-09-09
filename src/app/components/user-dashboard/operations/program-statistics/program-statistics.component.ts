import { Component, OnInit, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

import { SHARED_IMPORTS } from '../../../shared/shared-imports';

import { UserProgramStatisticsService } from '../../../../services/user/user-program-statistics.service';

import {
  ProgramStatisticsRow,
  ProgramStatisticsWorkout,
  ProgramStatisticsExercise,
} from '../../../../models/user-program-statistics.model';

import { UserMyProgramsService } from '../../../../services/user/user-my-program/user-my-programs.service';

@Component({
  selector: 'app-user-program-statistics',
  standalone: true,
  imports: [...SHARED_IMPORTS],
  templateUrl: './program-statistics.component.html',
  styleUrl: './program-statistics.component.css',
})
export class UserProgramStatisticsComponent implements OnInit {
  private readonly statisticsService = inject(UserProgramStatisticsService);

  private readonly programsService = inject(UserMyProgramsService);

  // ============================================================
  // PROGRAMOK
  // ============================================================

  programs: any[] = [];

  selectedProgramId: number | null = null;

  loadingPrograms = false;
  loadingStatistics = false;

  // ============================================================
  // STATISZTIKA
  // ============================================================

  statistics: ProgramStatisticsRow[] = [];

  groupedWorkouts: ProgramStatisticsWorkout[] = [];

  // ============================================================
  // WORKOUT LAPOZÁS
  // ============================================================

  currentWorkoutIndex = 0;

  // ============================================================
  // ÜZENETEK
  // ============================================================

  message = '';
  messageType: 'success' | 'error' | '' = '';

  // ============================================================
  // PROGRAM LAPOZÁS
  // ============================================================

  programPage = 1;
  programPageSize = 5;

  // ============================================================
  // INIT
  // ============================================================

  ngOnInit(): void {
    this.loadPrograms();
  }

  // ============================================================
  // PROGRAMOK BETÖLTÉSE
  // ============================================================

loadPrograms(): void {
  this.loadingPrograms = true;
  this.clearMessage();

  this.programsService.getPrograms().subscribe({
    next: (res: any) => {
      this.loadingPrograms = false;

      this.programs = this.extractPrograms(res);

      this.programPage = 1;
      this.currentWorkoutIndex = 0;

      if (!this.programs.length) {
        this.resetStatistics();

        this.selectedProgramId = null;

        this.message =
          'userProgramStatistics.noPrograms';

        return;
      }

      this.selectFirstProgram();
    },

    error: (err: HttpErrorResponse) => {
      this.loadingPrograms = false;

      this.programs = [];

      this.selectedProgramId = null;

      this.resetStatistics();

      this.message =
        err.error?.message ||
        'userProgramStatistics.loadError';

      this.messageType = 'error';

      console.error(
        '❌ User programok betöltése sikertelen:',
        err,
      );
    },
  });
}
  private clearMessage(): void {
  this.message = '';
  this.messageType = '';
}

private resetStatistics(): void {
  this.statistics = [];
  this.groupedWorkouts = [];
  this.currentWorkoutIndex = 0;
}

private extractPrograms(res: any): any[] {
  if (Array.isArray(res)) {
    return res;
  }

  return res?.data ?? res?.programs ?? [];
}

private selectFirstProgram(): void {
  const firstProgram = this.pagedPrograms[0];

  const firstProgramId =
    firstProgram?.programId ??
    firstProgram?.id;

  if (firstProgramId != null) {
    this.selectProgram(firstProgramId);
  }
}

  // ============================================================
  // PROGRAM LISTA LAPOZÁSA
  // ============================================================

  get pagedPrograms(): any[] {
    const start = (this.programPage - 1) * this.programPageSize;

    return this.programs.slice(start, start + this.programPageSize);
  }

  get totalProgramPages(): number {
    return Math.ceil(this.programs.length / this.programPageSize);
  }

  nextProgramPage(): void {
    if (this.programPage < this.totalProgramPages) {
      this.programPage++;
    }
  }

  prevProgramPage(): void {
    if (this.programPage > 1) {
      this.programPage--;
    }
  }

  // ============================================================
  // PROGRAM KIVÁLASZTÁSA
  // ============================================================

  selectProgram(programId: number): void {
    if (!programId || programId <= 0) {
      return;
    }

    this.selectedProgramId = programId;

    this.currentWorkoutIndex = 0;

    this.loadStatistics(programId);
  }

  isProgramSelected(programId: number): boolean {
    return this.selectedProgramId === programId;
  }

  // ============================================================
  // STATISZTIKA BETÖLTÉSE
  // ============================================================

  loadStatistics(programId: number): void {
    this.loadingStatistics = true;

    this.message = '';
    this.messageType = '';

    this.statistics = [];
    this.groupedWorkouts = [];
    this.currentWorkoutIndex = 0;

    this.statisticsService.getProgramStatistics(programId).subscribe({
      next: (res: ProgramStatisticsRow[]) => {
        this.loadingStatistics = false;

        this.statistics = res ?? [];

        if (!this.statistics.length) {
          this.message = 'userProgramStatistics.noData';

          return;
        }

        this.groupStatistics();
      },

      error: (err: HttpErrorResponse) => {
        this.loadingStatistics = false;

        this.statistics = [];
        this.groupedWorkouts = [];
        this.currentWorkoutIndex = 0;

        this.message = err.error?.message || 'userProgramStatistics.loadError';

        this.messageType = 'error';

        console.error('❌ Program statisztika betöltése sikertelen:', err);
      },
    });
  }

  // ============================================================
  // STATISZTIKA CSOPORTOSÍTÁSA
  // ============================================================

private groupStatistics(): void {
  const workoutMap = new Map<number, ProgramStatisticsWorkout>();

  for (const row of this.statistics) {
    const workout = this.getOrCreateWorkout(
      workoutMap,
      row,
    );

    const exercise = this.getOrCreateExercise(
      workout,
      row,
    );

    this.addSetIfNotExists(
      exercise,
      row,
    );
  }

  this.groupedWorkouts = this.sortWorkouts(
    Array.from(workoutMap.values()),
  );

  this.currentWorkoutIndex = 0;

  this.calculateAllExerciseProgress();
}
private getOrCreateWorkout(
  workoutMap: Map<number, ProgramStatisticsWorkout>,
  row: ProgramStatisticsRow,
): ProgramStatisticsWorkout {
  let workout = workoutMap.get(row.workoutId);

  if (!workout) {
    workout = {
      workoutId: row.workoutId,
      workoutName: row.workoutName,
      workoutDescription: row.workoutDescription,
      workoutDate: row.workoutDate,
      durationMinutes: row.durationMinutes,
      intensityLevel: row.intensityLevel,

      userWorkoutId: row.userWorkoutId,
      userWorkoutCompleted: row.userWorkoutCompleted,
      userWorkoutPerformedAt: row.userWorkoutPerformedAt,
      userWorkoutScheduledAt: row.userWorkoutScheduledAt,
      userWorkoutFeedback: row.userWorkoutFeedback,
      userWorkoutNotes: row.userWorkoutNotes,

      exercises: [],
    };

    workoutMap.set(
      row.workoutId,
      workout,
    );
  }

  return workout;
}
private getOrCreateExercise(
  workout: ProgramStatisticsWorkout,
  row: ProgramStatisticsRow,
): ProgramStatisticsExercise {
  let exercise = workout.exercises.find(
    (item) => item.exerciseId === row.exerciseId,
  );

  if (!exercise) {
    exercise = {
      exerciseId: row.exerciseId,
      exerciseName: row.exerciseName,
      muscleGroup: row.muscleGroup,
      equipment: row.equipment,
      difficultyLevel: row.difficultyLevel,
      category: row.category,

      userWorkoutExerciseId:
        row.userWorkoutExerciseId,

      userWorkoutExerciseCompleted:
        row.userWorkoutExerciseCompleted,

      userWorkoutExercisePerformedAt:
        row.userWorkoutExercisePerformedAt,

      userWorkoutExerciseFeedback:
        row.userWorkoutExerciseFeedback,

      userWorkoutExerciseNotes:
        row.userWorkoutExerciseNotes,

      setsDone: row.setsDone,

      sets: [],

      startWeight: undefined,
      currentWeight: undefined,
      weightChange: undefined,

      startRepetitions: undefined,
      currentRepetitions: undefined,
      repetitionsChange: undefined,
    };

    workout.exercises.push(exercise);
  }

  return exercise;
}
private addSetIfNotExists(
  exercise: ProgramStatisticsExercise,
  row: ProgramStatisticsRow,
): void {
  const existingSet = exercise.sets.find(
    (item) => item.setId === row.setId,
  );

  if (existingSet) {
    return;
  }

  exercise.sets.push({
    setId: row.setId,
    setNumber: row.setNumber,

    targetRepetitions:
      row.targetRepetitions,

    targetWeightKg:
      row.targetWeightKg,

    actualRepetitions:
      row.actualRepetitions,

    actualWeightKg:
      row.actualWeightKg,

    setStartedAt:
      row.setStartedAt,

    setCompletedAt:
      row.setCompletedAt,

    setCompleted:
      row.setCompleted,

    setNotes:
      row.setNotes,
  });
}
  private sortWorkouts(
  workouts: ProgramStatisticsWorkout[],
): ProgramStatisticsWorkout[] {
  return workouts.sort((a, b) => {
    const dateA = a.workoutDate
      ? new Date(a.workoutDate).getTime()
      : Number.MAX_SAFE_INTEGER;

    const dateB = b.workoutDate
      ? new Date(b.workoutDate).getTime()
      : Number.MAX_SAFE_INTEGER;

    if (dateA !== dateB) {
      return dateA - dateB;
    }

    const performedA = a.userWorkoutPerformedAt
      ? new Date(a.userWorkoutPerformedAt).getTime()
      : Number.MAX_SAFE_INTEGER;

    const performedB = b.userWorkoutPerformedAt
      ? new Date(b.userWorkoutPerformedAt).getTime()
      : Number.MAX_SAFE_INTEGER;

    return performedA - performedB;
  });
}
  private calculateAllExerciseProgress(): void {
  for (const workout of this.groupedWorkouts) {
    for (const exercise of workout.exercises) {
      this.calculateExerciseProgress(exercise);
    }
  }
}
  // ============================================================
  // AKTUÁLIS WORKOUT
  // ============================================================

  get currentWorkout(): ProgramStatisticsWorkout | null {
    if (!this.groupedWorkouts.length) {
      return null;
    }

    return this.groupedWorkouts[this.currentWorkoutIndex] ?? null;
  }

  // ============================================================
  // WORKOUT LAPOZÁS
  // ============================================================

  nextWorkout(): void {
    if (this.currentWorkoutIndex < this.groupedWorkouts.length - 1) {
      this.currentWorkoutIndex++;
    }
  }

  previousWorkout(): void {
    if (this.currentWorkoutIndex > 0) {
      this.currentWorkoutIndex--;
    }
  }

  get totalWorkouts(): number {
    return this.groupedWorkouts.length;
  }

  // ============================================================
  // EXERCISE FEJLŐDÉS
  // ============================================================

  private calculateExerciseProgress(exercise: ProgramStatisticsExercise): void {
    const validSets = exercise.sets.filter(
      (set) =>
        set.setCompleted === true && (set.actualWeightKg != null || set.actualRepetitions != null),
    );

    if (!validSets.length) {
      return;
    }

    // ==========================================================
    // SÚLY FEJLŐDÉS
    // ==========================================================

    const weights = validSets
      .map((set) => set.actualWeightKg)
      .filter((weight): weight is number => weight != null);

    if (weights.length) {
      exercise.startWeight = weights[0];

      exercise.currentWeight = weights[weights.length - 1];

      exercise.weightChange = exercise.currentWeight - exercise.startWeight;
    }

    // ==========================================================
    // ISMÉTLÉS FEJLŐDÉS
    // ==========================================================

    const repetitions = validSets
      .map((set) => set.actualRepetitions)
      .filter((reps): reps is number => reps != null);

    if (repetitions.length) {
      exercise.startRepetitions = repetitions[0];

      exercise.currentRepetitions = repetitions[repetitions.length - 1];

      exercise.repetitionsChange = exercise.currentRepetitions - exercise.startRepetitions;
    }
  }
}
