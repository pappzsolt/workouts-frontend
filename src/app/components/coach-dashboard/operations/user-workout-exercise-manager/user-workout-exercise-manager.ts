import type { UserProgramDay } from '../../../../models/user-program/user-program-day.model';
import type { UserProgramExercise } from '../../../../models/user-program/user-program-exercise.model';
import type { UserProgramExerciseRow } from '../../../../models/user-program/user-program-exercise-row.model';
import type { UserProgramWorkout } from '../../../../models/user-program/user-program-workout.model';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';


import { Subject, takeUntil } from 'rxjs';

import { WorkoutExercisesManagerService } from '../../../../services/coach/workout-exercises-manager.service';
import { UserWorkoutExerciseSetService } from '../../../../services/coach/user-workout-exercise-set';

import { LanguageService } from '../../../../services/shared/language.service';

import { UserWorkoutExerciseSetModel } from '../../../../models/user-workout-exercise-set.model';

import { UserSelectComponent } from '../../../shared/user/user-select.component';
import { CoachProgramSelectComponent } from '../../../shared/programs/coach-program-select.component';

import { SHARED_IMPORTS } from '../../../shared/shared-imports';


@Component({
  selector: 'app-user-workout-exercise-manager',
  standalone: true,
  imports: [...SHARED_IMPORTS, UserSelectComponent, CoachProgramSelectComponent],
  templateUrl: './user-workout-exercise-manager.component.html',
  styleUrls: ['./user-workout-exercise-manager.component.css'],
})
export class UserWorkoutExerciseManagerComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  // ============================
  // USER / PROGRAM
  // ============================

  selectedUserId?: number;
  selectedProgramId?: number;
  scheduledAt?: string;

  selectedUserWorkoutId?: number;
  newWorkoutExerciseId?: number;

  // ============================
  // PROGRAM DATA
  // ============================

  userProgramData: UserProgramExerciseRow[] = [];
  dayGroups: UserProgramDay[] = [];

  // ============================
  // SETS
  // ============================

  selectedUserWorkoutExerciseId?: number;
  selectedSets: UserWorkoutExerciseSetModel[] = [];
  message = '';
  messageType: 'success' | 'error' | 'info' | '' = '';
  messageParams: Record<string, unknown> = {};
  setPendingDeletion: UserWorkoutExerciseSetModel | null = null;
  deletingSet = false;
  /** Only one set is expanded for editing at a time. */
  expandedSetId?: number;

  constructor(
    private service: WorkoutExercisesManagerService,
    private setService: UserWorkoutExerciseSetService,
    private languageService: LanguageService,
  ) {}

  ngOnInit(): void {
    this.languageService.language$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      if (this.selectedUserId && this.selectedProgramId) {
        this.loadUserProgramWithExercises();
      }

      if (this.selectedUserWorkoutExerciseId) {
        this.loadSets(this.selectedUserWorkoutExerciseId);
      }
    });
  }

  private showMessage(
    message: string,
    type: 'success' | 'error' | 'info' = 'info',
    params: Record<string, unknown> = {},
  ): void {
    this.message = message;
    this.messageParams = params;
    this.messageType = type;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============================
  // SETS LEKÉRÉSE
  // ============================

  loadSets(userWorkoutExerciseId: number): void {
    if (!userWorkoutExerciseId || userWorkoutExerciseId <= 0) {
      this.selectedSets = [];
      this.selectedUserWorkoutExerciseId = undefined;
      return;
    }

    this.selectedUserWorkoutExerciseId = userWorkoutExerciseId;
    this.selectedSets = [];
    this.expandedSetId = undefined;

    this.setService.getSetsByUserWorkoutExerciseId(userWorkoutExerciseId).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.selectedSets = res.data;
        } else {
          this.selectedSets = [];
        }
      },
      error: () => {
        this.selectedSets = [];
      },
    });
  }

  // ============================
  // SET KIVÁLASZTÁSA / SZERKESZTÉSE
  // ============================

  toggleSetEditor(set: UserWorkoutExerciseSetModel): void {
    if (set.id == null) {
      return;
    }

    this.expandedSetId = this.expandedSetId === set.id ? undefined : set.id;
  }

  // ============================
  // ÚJ SET HOZZÁADÁSA
  // ============================

  addSet(): void {
    const userWorkoutExerciseId = this.selectedUserWorkoutExerciseId;

    if (!userWorkoutExerciseId) {
      this.showMessage('userWorkoutExerciseManager.noExerciseSelected', 'error');
      return;
    }

    this.setService.addSet(userWorkoutExerciseId).subscribe({
      next: () => {
        this.loadSets(userWorkoutExerciseId);
      },
      error: (err: HttpErrorResponse) => {
        this.showMessage(
          err?.error?.message ?? 'userWorkoutExerciseManager.addSetError',
          'error',
        );
      },
    });
  }

  // ============================
  // SET MÓDOSÍTÁSA
  // ============================

  updateSet(set: UserWorkoutExerciseSetModel): void {
    if (set.id == null) {
      this.showMessage('userWorkoutExerciseManager.setIdMissing', 'error');
      return;
    }

    const data: Partial<UserWorkoutExerciseSetModel> = {
      setNumber: set.setNumber,
      targetRepetitions: set.targetRepetitions,
      targetWeightKg: set.targetWeightKg,
      actualRepetitions: set.actualRepetitions,
      actualWeightKg: set.actualWeightKg,
      completed: set.completed,
      notes: set.notes,
    };

    this.setService.updateSet(set.id, data).subscribe({
      next: () => {
        this.showMessage(
          'userWorkoutExerciseManager.updateSetSuccess',
          'success',
          { setNumber: set.setNumber },
        );
      },
      error: (err: HttpErrorResponse) => {
        this.showMessage(
          err?.error?.message ?? 'userWorkoutExerciseManager.updateSetError',
          'error',
        );
      },
    });
  }

  // ============================
  // SET TÖRLÉSE
  // ============================

  deleteSet(set: UserWorkoutExerciseSetModel): void {
    if (set.id == null) {
      this.showMessage('userWorkoutExerciseManager.setIdMissing', 'error');
      return;
    }
    this.setPendingDeletion = set;
  }

  cancelSetDeletion(): void {
    if (!this.deletingSet) this.setPendingDeletion = null;
  }

  confirmSetDeletion(): void {
    const set = this.setPendingDeletion;
    if (!set || set.id == null || this.deletingSet) return;

    this.deletingSet = true;
    const userWorkoutExerciseId = this.selectedUserWorkoutExerciseId;
    this.setService.deleteSet(set.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.selectedSets = this.selectedSets.filter((currentSet) => currentSet.id !== set.id);
        this.setPendingDeletion = null;
        this.deletingSet = false;
        this.showMessage('userWorkoutExerciseManager.deleteSetSuccess', 'success', {
          setNumber: set.setNumber,
        });
        if (userWorkoutExerciseId) {
          this.loadSets(userWorkoutExerciseId);
          this.loadUserProgramWithExercises();
        }
      },
      error: (err: HttpErrorResponse) => {
        this.deletingSet = false;
        this.setPendingDeletion = null;
        this.showMessage(err?.error?.message ?? 'userWorkoutExerciseManager.deleteSetError', 'error');
      },
    });
  }

  // ============================
  // USER WORKOUT LÉTREHOZÁSA
  // ============================

  // ============================
  // USER WORKOUT LÉTREHOZÁSA
  // ============================

  addUserWorkouts(): void {
    if (!this.selectedUserId || !this.selectedProgramId) {
      this.showMessage('userWorkoutExerciseManager.missingUserOrProgram', 'error');
      return;
    }

    this.service
      .addUserWorkout(this.selectedUserId, this.selectedProgramId, this.scheduledAt)
      .subscribe({
        next: (res) => {
          if (res.success && res.data && res.data.length > 0) {
            this.selectedUserWorkoutId = res.data[0];

            this.newWorkoutExerciseId = undefined;
          } else {
            this.showMessage(
              res.message ?? 'userWorkoutExerciseManager.createUserWorkoutError',
              'error',
            );
          }
        },

        error: (err: HttpErrorResponse) => {
          this.showMessage(
            err?.error?.message ?? 'userWorkoutExerciseManager.createUserWorkoutError',
            'error',
          );
        },
      });
  }

  // ============================
  // PROGRAM + EXERCISES
  // ============================

  loadUserProgramWithExercises(): void {
    if (!this.selectedUserId || !this.selectedProgramId) {
      this.showMessage('userWorkoutExerciseManager.selectUserAndProgram', 'error');
      return;
    }

    this.service
      .getUserProgramWithExercises(this.selectedUserId, this.selectedProgramId)
      .subscribe({
        next: (res) => {
          if (res.success && res.data) {
            this.userProgramData = res.data;
            this.dayGroups = this.groupByDayAndWorkout(this.userProgramData);
          } else {
            this.userProgramData = [];
            this.dayGroups = [];
          }
        },
        error: () => {
          this.userProgramData = [];
          this.dayGroups = [];
        },
      });
  }

  // ============================
  // DAY → WORKOUT → EXERCISE
  // ============================

  private groupByDayAndWorkout(rows: UserProgramExerciseRow[]): UserProgramDay[] {
    const groupedDays = new Map<string, UserProgramDay>();

    for (const row of rows) {
      const dateKey = row.scheduled_date ?? 'nincs_datum';

      if (!groupedDays.has(dateKey)) {
        groupedDays.set(dateKey, {
          date: row.scheduled_date,
          programDayIndex: row.program_day_index,
          workouts: [],
        });
      }

      const day = groupedDays.get(dateKey);
      if (!day) {
        continue;
      }

      const rowUserWorkoutId = Number(row.user_workout_id ?? row.userWorkoutId);
      const rowProgramWorkoutId = Number(row.program_workout_id ?? row.programWorkoutId);
      const rowWorkoutId = Number(row.workout_id ?? row.workoutId);

      /*
       * A workoutId önmagában NEM azonosít egy occurrence-t.
       * Ugyanaz a workout több program_workout / user_workout occurrence-ben
       * is szerepelhet, ezért a csoportosítás elsődleges kulcsa a konkrét
       * userWorkoutId, másodsorban a programWorkoutId.
       */
      let workout = day.workouts.find((currentWorkout) => {
        if (rowUserWorkoutId > 0 && currentWorkout.userWorkoutId === rowUserWorkoutId) {
          return true;
        }

        if (
          rowUserWorkoutId <= 0 &&
          rowProgramWorkoutId > 0 &&
          currentWorkout.programWorkoutId === rowProgramWorkoutId
        ) {
          return true;
        }

        return false;
      });

      if (!workout) {
        workout = {
          userWorkoutId: rowUserWorkoutId > 0 ? rowUserWorkoutId : undefined,
          programWorkoutId: rowProgramWorkoutId > 0 ? rowProgramWorkoutId : undefined,
          workoutId: rowWorkoutId,
          workoutName: row.workout_name ?? row.workoutName,
          scheduledAt: row.scheduled_date ?? row.scheduledAt ?? null,
          workoutCompleted: (row.workout_completed ?? row.workoutCompleted) === true,
          exercises: [],
        };

        day.workouts.push(workout);
      }

      workout.exercises.push({
        userWorkoutExerciseId: row.user_workout_exercise_id,
        workoutExerciseId: row.workout_exercise_id,
        order: row.exercise_order,
        exerciseId: row.exercise_id,
        exerciseName: row.exercise_name,
        exerciseCompleted: row.exercise_completed === true,
        setsDone: row.sets_done,
        feedback: row.feedback,
        notes: row.notes,
        performedAt: row.performed_at,
      });
    }

    return Array.from(groupedDays.values())
      .sort((a, b) => {
        if (a.date && b.date) {
          return a.date.localeCompare(b.date);
        }

        return (a.programDayIndex ?? 0) - (b.programDayIndex ?? 0);
      })
      .map((day) => {
        day.workouts = day.workouts.map((workout) => {
          workout.exercises = workout.exercises.sort(
            (a: UserProgramExercise, b: UserProgramExercise) => (a.order ?? 0) - (b.order ?? 0),
          );

          return workout;
        });

        return day;
      });
  }

  // ============================
  // SCHEDULED DATE FRISSÍTÉSE
  // ============================

  updateScheduledDate(workout: UserProgramWorkout, scheduledAt: string | null): void {
    if (!workout.userWorkoutId) {
      this.showMessage('userWorkoutExerciseManager.userWorkoutIdMissing', 'error');
      return;
    }

    if (!scheduledAt) {
      this.showMessage('userWorkoutExerciseManager.scheduledDateRequired', 'error');
      return;
    }

    this.service.updateUserWorkoutScheduledDate(workout.userWorkoutId, scheduledAt).subscribe({
      next: (res) => {
        if (res.success) {
          workout.scheduledAt = scheduledAt;
          this.loadUserProgramWithExercises();
        } else {
          this.showMessage(
            res.message ?? 'userWorkoutExerciseManager.scheduledDateUpdateError',
            'error',
          );
        }
      },

      error: (err: HttpErrorResponse) => {
        this.showMessage(
          err?.error?.message ?? 'userWorkoutExerciseManager.scheduledDateUpdateError',
          'error',
        );
      },
    });
  }
  // ============================
  // ANGULAR TRACK BY
  // ============================

  trackByDay(index: number, day: UserProgramDay): number {
    return day.programDayIndex ?? index;
  }

  trackByWorkout(index: number, workout: UserProgramWorkout): number {
    return workout.userWorkoutId ?? workout.programWorkoutId ?? workout.workoutId ?? index;
  }

  trackByExercise(index: number, exercise: UserProgramExercise): number {
    return exercise.userWorkoutExerciseId ?? index;
  }

  trackBySet(index: number, set: UserWorkoutExerciseSetModel): number {
    return set.id ?? index;
  }

  // ============================
  // WORKOUT EXERCISE SORREND
  // ============================

  updateExerciseOrderIndex(workoutId: number, exerciseId: number, orderIndex: number | undefined): void {
    if (!workoutId) {
      this.showMessage('userWorkoutExerciseManager.workoutIdMissing', 'error');
      return;
    }

    if (!exerciseId) {
      this.showMessage('userWorkoutExerciseManager.exerciseIdMissing', 'error');
      return;
    }

    if (orderIndex == null) {
      this.showMessage('userWorkoutExerciseManager.orderIndexRequired', 'error');
      return;
    }

    this.service.updateExerciseOrderIndex(workoutId, exerciseId, orderIndex).subscribe({
      next: () => {
        const workout = this.dayGroups
          .flatMap((day) => day.workouts)
          .find((currentWorkout) => currentWorkout.workoutId === workoutId);

        if (!workout) {
          return;
        }

        const exercise = workout.exercises.find(
          (currentExercise: UserProgramExercise) => currentExercise.exerciseId === exerciseId,
        );

        if (!exercise) {
          return;
        }

        exercise.order = orderIndex;

        workout.exercises = workout.exercises.sort(
          (a: UserProgramExercise, b: UserProgramExercise) => (a.order ?? 0) - (b.order ?? 0),
        );
      },
      error: (err: HttpErrorResponse) => {
        this.showMessage(
          err?.error?.message ?? 'userWorkoutExerciseManager.orderUpdateError',
          'error',
        );
      },
    });
  }
}
