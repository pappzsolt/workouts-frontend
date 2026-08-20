import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { WorkoutExercisesManagerService } from '../../../../services/coach/workout-exercises-manager.service';
import { UserWorkoutExerciseSetService } from '../../../../services/coach/user-workout-exercise-set';

import { UserWorkoutExerciseSetModel } from '../../../../models/user-workout-exercise-set.model';

import { UserSelectComponent } from '../../../shared/user/user-select.component';
import { CoachProgramSelectComponent } from '../../../shared/programs/coach-program-select.component';

@Component({
  selector: 'app-user-workout-exercise-manager',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    UserSelectComponent,
    CoachProgramSelectComponent
  ],
  templateUrl: './user-workout-exercise-manager.component.html'
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
    private setService: UserWorkoutExerciseSetService
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

    this.setService
      .getSetsByUserWorkoutExerciseId(userWorkoutExerciseId)
      .subscribe({
        next: (sets: UserWorkoutExerciseSetModel[]) => {
          this.selectedSets = sets ?? [];
        },

        error: (err: any) => {
          console.error(
            'Hiba a set-ek lekérésekor:',
            err
          );

          this.selectedSets = [];
        }
      });
  }

  // ============================
  // ÚJ SET HOZZÁADÁSA
  // ============================

  addSet(): void {

    const userWorkoutExerciseId =
      this.selectedUserWorkoutExerciseId;

    if (!userWorkoutExerciseId) {
      alert('Nincs kiválasztva user workout exercise.');
      return;
    }

    this.setService
      .addSet(userWorkoutExerciseId)
      .subscribe({
        next: () => {

          // Backend után újra lekérjük a set-eket,
          // így a frontend mindig a DB aktuális állapotát mutatja.
          this.loadSets(userWorkoutExerciseId);
        },

        error: (err: any) => {

          console.error(
            'Hiba az új set létrehozásakor:',
            err
          );

          alert(
            err?.error?.message ||
            'Hiba történt az új set hozzáadásakor.'
          );
        }
      });
  }

  // ============================
  // SET MÓDOSÍTÁSA
  // ============================

  updateSet(set: UserWorkoutExerciseSetModel): void {

    if (set.id == null) {
      alert('A set azonosítója hiányzik.');
      return;
    }

    const data: Partial<UserWorkoutExerciseSetModel> = {
      setNumber: set.setNumber,
      targetRepetitions: set.targetRepetitions,
      targetWeightKg: set.targetWeightKg,
      actualRepetitions: set.actualRepetitions,
      actualWeightKg: set.actualWeightKg,
      completed: set.completed,
      notes: set.notes
    };

    this.setService
      .updateSet(set.id, data)
      .subscribe({
        next: () => {
          alert(
            `Set #${set.setNumber} sikeresen módosítva.`
          );
        },

        error: (err: any) => {

          console.error(
            'Hiba a set módosításakor:',
            err
          );

          alert(
            err?.error?.message ||
            'Hiba történt a set módosításakor.'
          );
        }
      });
  }

  // ============================
  // SET TÖRLÉSE
  // ============================

  deleteSet(set: UserWorkoutExerciseSetModel): void {

    if (set.id == null) {
      alert('A set azonosítója hiányzik.');
      return;
    }

    if (
      !confirm(
        `Biztosan törölni szeretnéd a ${set.setNumber}. set-et?`
      )
    ) {
      return;
    }

    const userWorkoutExerciseId =
      this.selectedUserWorkoutExerciseId;

    this.setService
      .deleteSet(set.id)
      .subscribe({
        next: () => {

          /*
           * Először azonnal frissítjük a lokális listát,
           * hogy a UI ne várjon a GET-re.
           */
          this.selectedSets =
            this.selectedSets.filter(
              s => s.id !== set.id
            );

          /*
           * A backend újraszámozza a set-eket,
           * ezért utána lekérjük az aktuális állapotot.
           */
          if (userWorkoutExerciseId) {
            this.loadSets(userWorkoutExerciseId);
          }
        },

        error: (err: any) => {

          console.error(
            'Hiba a set törlésekor:',
            err
          );

          alert(
            err?.error?.message ||
            'Hiba történt a set törlésekor.'
          );
        }
      });
  }

  // ============================
  // USER WORKOUT LÉTREHOZÁSA
  // ============================

  addUserWorkouts(): void {

    if (
      !this.selectedUserId ||
      !this.selectedProgramId
    ) {
      alert(
        'Hiányzó adatok: userId vagy programId!'
      );

      return;
    }

    this.service
      .addUserWorkout(
        this.selectedUserId,
        this.selectedProgramId,
        this.scheduledAt
      )
      .subscribe({
        next: res => {

          this.selectedUserWorkoutId =
            res.userWorkoutId;

          this.newWorkoutExerciseId =
            undefined;
        },

        error: (err: any) => {

          console.error(
            'Hiba a user workout létrehozásakor:',
            err
          );
        }
      });
  }

  // ============================
  // PROGRAM + EXERCISES
  // ============================

  loadUserProgramWithExercises(): void {

    if (
      !this.selectedUserId ||
      !this.selectedProgramId
    ) {
      alert(
        'Előbb válassz usert és programot!'
      );

      return;
    }

    this.service
      .getUserProgramWithExercises(
        this.selectedUserId,
        this.selectedProgramId
      )
      .subscribe({
        next: data => {

          this.userProgramData =
            data ?? [];

          this.dayGroups =
            this.groupByDayAndWorkout(
              this.userProgramData
            );
        },

        error: (err: any) => {

          console.error(
            'Hiba a program + exercises lekérésekor:',
            err
          );

          this.userProgramData = [];
          this.dayGroups = [];
        }
      });
  }

  // ============================
  // DAY → WORKOUT → EXERCISE
  // ============================

  private groupByDayAndWorkout(
    rows: any[]
  ): any[] {

    const map = new Map<string, any>();

    for (const row of rows) {

      const dateKey =
        row.scheduled_date ?? 'nincs_datum';

      if (!map.has(dateKey)) {

        map.set(dateKey, {
          date: row.scheduled_date,
          programDayIndex: row.program_day_index,
          workouts: []
        });
      }

      const dayObj =
        map.get(dateKey);

      let workout =
        dayObj.workouts.find(
          (w: any) =>
            w.workoutId === row.workout_id
        );

      if (!workout) {

        workout = {
          userWorkoutId: row.user_workout_id,
          workoutId: row.workout_id,
          workoutName: row.workout_name,

          scheduledAt: row.scheduled_date,

          workoutCompleted:
            row.workout_completed === true,

          exercises: []
        };

        dayObj.workouts.push(workout);
      }

      workout.exercises.push({
        userWorkoutExerciseId:
        row.user_workout_exercise_id,

        workoutExerciseId:
        row.workout_exercise_id,

        order:
        row.exercise_order,

        exerciseId:
        row.exercise_id,

        exerciseName:
        row.exercise_name,

        exerciseCompleted:
          row.exercise_completed === true,

        setsDone:
        row.sets_done,

        feedback:
        row.feedback,

        notes:
        row.notes,

        performedAt:
        row.performed_at
      });
    }

    return Array.from(map.values())
      .sort((a, b) => {

        if (a.date && b.date) {
          return a.date.localeCompare(b.date);
        }

        return (
          (a.programDayIndex ?? 0) -
          (b.programDayIndex ?? 0)
        );
      })
      .map(day => {

        day.workouts =
          day.workouts.map(
            (workout: any) => {

              workout.exercises =
                workout.exercises.sort(
                  (a: any, b: any) =>
                    (a.order ?? 0) -
                    (b.order ?? 0)
                );

              return workout;
            }
          );

        return day;
      });
  }
  /**
   * Egy már létező user workout scheduled dátumának módosítása.
   */
  updateScheduledDate(
    workout: any,
    scheduledAt: string
  ): void {

    if (!workout.userWorkoutId) {
      alert('A user workout azonosítója hiányzik.');
      return;
    }

    if (!scheduledAt) {
      alert('A scheduled date megadása kötelező.');
      return;
    }

    this.service
      .updateUserWorkoutScheduledDate(
        workout.userWorkoutId,
        scheduledAt
      )
      .subscribe({

        next: () => {

          workout.scheduledAt = scheduledAt;

          console.log(
            'Scheduled date frissítve:',
            {
              userWorkoutId: workout.userWorkoutId,
              scheduledAt
            }
          );

          // Az aktuális napstruktúrát is frissítjük.
          this.loadUserProgramWithExercises();
        },

        error: (err: any) => {

          console.error(
            'Hiba a scheduled date frissítésekor:',
            err
          );

          alert(
            err?.error?.message ||
            'Hiba történt a scheduled date módosításakor.'
          );
        }
      });
  }
  // ============================
  // ANGULAR TRACK BY
  // ============================

  trackByDay(
    index: number,
    day: any
  ): any {
    return day.programDayIndex ?? index;
  }

  trackByWorkout(
    index: number,
    workout: any
  ): any {
    return workout.workoutId ?? index;
  }

  trackByExercise(
    index: number,
    exercise: any
  ): any {
    return exercise.userWorkoutExerciseId ?? index;
  }

  trackBySet(
    index: number,
    set: UserWorkoutExerciseSetModel
  ): any {
    return set.id ?? index;
  }
  /**
   * ============================
   * WORKOUT EXERCISE SORREND
   * ============================
   *
   * Workout exercise sorrendjének módosítása.
   */
  updateExerciseOrderIndex(
    workoutId: number,
    exerciseId: number,
    orderIndex: number
  ): void {

    if (!workoutId) {
      alert('A workout azonosítója hiányzik.');
      return;
    }

    if (!exerciseId) {
      alert('Az exercise azonosítója hiányzik.');
      return;
    }

    if (orderIndex == null) {
      alert('Az order index megadása kötelező.');
      return;
    }

    this.service
      .updateExerciseOrderIndex(
        workoutId,
        exerciseId,
        orderIndex
      )
      .subscribe({

        next: () => {

          console.log(
            'Exercise sorrendje frissítve:',
            {
              workoutId,
              exerciseId,
              orderIndex
            }
          );

          // A lokális adatban is frissítjük az értéket.
          const workout =
            this.dayGroups
              .flatMap(day => day.workouts)
              .find(
                (w: any) =>
                  w.workoutId === workoutId
              );

          if (workout) {

            const exercise =
              workout.exercises.find(
                (e: any) =>
                  e.exerciseId === exerciseId
              );

            if (exercise) {
              exercise.order = orderIndex;
            }

            // Újrarendezzük az exercise-eket.
            workout.exercises =
              workout.exercises.sort(
                (a: any, b: any) =>
                  (a.order ?? 0) -
                  (b.order ?? 0)
              );
          }
        },

        error: (err: any) => {

          console.error(
            'Hiba az exercise sorrendjének frissítésekor:',
            err
          );

          alert(
            err?.error?.message ||
            'Hiba történt az exercise sorrendjének módosításakor.'
          );
        }
      });
  }
}
