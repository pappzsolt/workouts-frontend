import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

import { WorkoutExercisesManagerService } from '../../../../services/coach/workout-exercises-manager.service';
import { UserWorkoutExerciseSetService } from '../../../../services/coach/user-workout-exercise-set';

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
export class UserWorkoutExerciseManagerComponent implements OnInit {
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

  userProgramData: any[] = [];
  dayGroups: any[] = [];

  // ============================
  // SETS
  // ============================

  selectedUserWorkoutExerciseId?: number;
  selectedSets: UserWorkoutExerciseSetModel[] = [];

  constructor(
    private service: WorkoutExercisesManagerService,
    private setService: UserWorkoutExerciseSetService,
    private translate: TranslateService,
  ) {}

  ngOnInit(): void {}

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

    this.setService.getSetsByUserWorkoutExerciseId(userWorkoutExerciseId).subscribe({
      next: (sets: UserWorkoutExerciseSetModel[]) => {
        this.selectedSets = sets ?? [];
      },
      error: () => {
        this.selectedSets = [];
      },
    });
  }

  // ============================
  // ÚJ SET HOZZÁADÁSA
  // ============================

  addSet(): void {
    const userWorkoutExerciseId = this.selectedUserWorkoutExerciseId;

    if (!userWorkoutExerciseId) {
      alert(this.translate.instant('userWorkoutExerciseManager.noExerciseSelected'));
      return;
    }

    this.setService.addSet(userWorkoutExerciseId).subscribe({
      next: () => {
        this.loadSets(userWorkoutExerciseId);
      },
      error: (err: any) => {
        alert(
          err?.error?.message || this.translate.instant('userWorkoutExerciseManager.addSetError'),
        );
      },
    });
  }

  // ============================
  // SET MÓDOSÍTÁSA
  // ============================

  updateSet(set: UserWorkoutExerciseSetModel): void {
    if (set.id == null) {
      alert(this.translate.instant('userWorkoutExerciseManager.setIdMissing'));
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
        alert(
          this.translate.instant('userWorkoutExerciseManager.updateSetSuccess', {
            setNumber: set.setNumber,
          }),
        );
      },
      error: (err: any) => {
        alert(
          err?.error?.message ||
            this.translate.instant('userWorkoutExerciseManager.updateSetError'),
        );
      },
    });
  }

  // ============================
  // SET TÖRLÉSE
  // ============================

  deleteSet(set: UserWorkoutExerciseSetModel): void {
    if (set.id == null) {
      alert(this.translate.instant('userWorkoutExerciseManager.setIdMissing'));
      return;
    }

    if (
      !confirm(
        this.translate.instant('userWorkoutExerciseManager.deleteSetConfirm', {
          setNumber: set.setNumber,
        }),
      )
    ) {
      return;
    }

    const userWorkoutExerciseId = this.selectedUserWorkoutExerciseId;

    this.setService.deleteSet(set.id).subscribe({
      next: () => {
        this.selectedSets = this.selectedSets.filter((currentSet) => currentSet.id !== set.id);

        if (userWorkoutExerciseId) {
          this.loadSets(userWorkoutExerciseId);
          this.loadUserProgramWithExercises();
        }
      },
      error: (err: any) => {
        alert(
          err?.error?.message ||
            this.translate.instant('userWorkoutExerciseManager.deleteSetError'),
        );
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
      alert(this.translate.instant('userWorkoutExerciseManager.missingUserOrProgram'));
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
            alert(
              res.message ||
                this.translate.instant('userWorkoutExerciseManager.createUserWorkoutError'),
            );
          }
        },

        error: (err: any) => {
          alert(
            err?.error?.message ||
              this.translate.instant('userWorkoutExerciseManager.createUserWorkoutError'),
          );
        },
      });
  }

  // ============================
  // PROGRAM + EXERCISES
  // ============================

  loadUserProgramWithExercises(): void {
    if (!this.selectedUserId || !this.selectedProgramId) {
      alert(this.translate.instant('userWorkoutExerciseManager.selectUserAndProgram'));
      return;
    }

    this.service
      .getUserProgramWithExercises(this.selectedUserId, this.selectedProgramId)
      .subscribe({
        next: (data) => {
          this.userProgramData = data ?? [];
          this.dayGroups = this.groupByDayAndWorkout(this.userProgramData);
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

  private groupByDayAndWorkout(rows: any[]): any[] {
    const groupedDays = new Map<string, any>();

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

      let workout = day.workouts.find(
        (currentWorkout: any) => currentWorkout.workoutId === row.workout_id,
      );

      if (!workout) {
        workout = {
          userWorkoutId: row.user_workout_id,
          workoutId: row.workout_id,
          workoutName: row.workout_name,
          scheduledAt: row.scheduled_date,
          workoutCompleted: row.workout_completed === true,
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
        day.workouts = day.workouts.map((workout: any) => {
          workout.exercises = workout.exercises.sort(
            (a: any, b: any) => (a.order ?? 0) - (b.order ?? 0),
          );

          return workout;
        });

        return day;
      });
  }

  // ============================
  // SCHEDULED DATE FRISSÍTÉSE
  // ============================

  updateScheduledDate(workout: any, scheduledAt: string): void {
    if (!workout.userWorkoutId) {
      alert(this.translate.instant('userWorkoutExerciseManager.userWorkoutIdMissing'));
      return;
    }

    if (!scheduledAt) {
      alert(this.translate.instant('userWorkoutExerciseManager.scheduledDateRequired'));
      return;
    }

    this.service.updateUserWorkoutScheduledDate(workout.userWorkoutId, scheduledAt).subscribe({
      next: () => {
        workout.scheduledAt = scheduledAt;
        this.loadUserProgramWithExercises();
      },
      error: (err: any) => {
        alert(
          err?.error?.message ||
            this.translate.instant('userWorkoutExerciseManager.scheduledDateUpdateError'),
        );
      },
    });
  }

  // ============================
  // ANGULAR TRACK BY
  // ============================

  trackByDay(index: number, day: any): any {
    return day.programDayIndex ?? index;
  }

  trackByWorkout(index: number, workout: any): any {
    return workout.workoutId ?? index;
  }

  trackByExercise(index: number, exercise: any): any {
    return exercise.userWorkoutExerciseId ?? index;
  }

  trackBySet(index: number, set: UserWorkoutExerciseSetModel): any {
    return set.id ?? index;
  }

  // ============================
  // WORKOUT EXERCISE SORREND
  // ============================

  updateExerciseOrderIndex(workoutId: number, exerciseId: number, orderIndex: number): void {
    if (!workoutId) {
      alert(this.translate.instant('userWorkoutExerciseManager.workoutIdMissing'));
      return;
    }

    if (!exerciseId) {
      alert(this.translate.instant('userWorkoutExerciseManager.exerciseIdMissing'));
      return;
    }

    if (orderIndex == null) {
      alert(this.translate.instant('userWorkoutExerciseManager.orderIndexRequired'));
      return;
    }

    this.service.updateExerciseOrderIndex(workoutId, exerciseId, orderIndex).subscribe({
      next: () => {
        const workout = this.dayGroups
          .flatMap((day) => day.workouts)
          .find((currentWorkout: any) => currentWorkout.workoutId === workoutId);

        if (!workout) {
          return;
        }

        const exercise = workout.exercises.find(
          (currentExercise: any) => currentExercise.exerciseId === exerciseId,
        );

        if (!exercise) {
          return;
        }

        exercise.order = orderIndex;

        workout.exercises = workout.exercises.sort(
          (a: any, b: any) => (a.order ?? 0) - (b.order ?? 0),
        );
      },
      error: (err: any) => {
        alert(
          err?.error?.message ||
            this.translate.instant('userWorkoutExerciseManager.orderUpdateError'),
        );
      },
    });
  }
}
