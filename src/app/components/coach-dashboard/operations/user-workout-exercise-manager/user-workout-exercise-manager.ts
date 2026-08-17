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

    console.log('=== LOAD SETS ===');

    console.log(
      'Kapott userWorkoutExerciseId:',
      userWorkoutExerciseId
    );

    this.selectedUserWorkoutExerciseId =
      userWorkoutExerciseId;

    console.log(
      'selectedUserWorkoutExerciseId:',
      this.selectedUserWorkoutExerciseId
    );

    this.selectedSets = [];

    console.log(
      'Backend GET indítása:',
      `/api/user-workout-exercise-sets/${userWorkoutExerciseId}`
    );

    this.setService
      .getSetsByUserWorkoutExerciseId(userWorkoutExerciseId)
      .subscribe({
        next: (sets: UserWorkoutExerciseSetModel[]) => {

          console.log('=== BACKEND RESPONSE ===');

          console.log(
            'Kapott sets:',
            sets
          );

          console.log(
            'Kapott sets JSON:',
            JSON.stringify(sets, null, 2)
          );

          console.log(
            'Kapott sets darabszáma:',
            sets?.length ?? 0
          );

          this.selectedSets =
            sets ?? [];

          console.log(
            'selectedSets:',
            this.selectedSets
          );

          console.log(
            'selectedSets JSON:',
            JSON.stringify(
              this.selectedSets,
              null,
              2
            )
          );
        },

        error: (err: any) => {

          console.error(
            '=== BACKEND ERROR ==='
          );

          console.error(
            'Hiba a set-ek lekérésekor:',
            err
          );

          this.selectedSets = [];
        }
      });
  }

  // ============================
  // SET MÓDOSÍTÁSA
  // ============================

  updateSet(set: UserWorkoutExerciseSetModel): void {

    console.log('=== UPDATE SET ===');

    console.log(
      'Set ID:',
      set.id
    );

    console.log(
      'Módosítandó set:',
      set
    );

    // Az ID kötelező a PUT kéréshez
    if (set.id == null) {

      console.error(
        'A set ID hiányzik, a módosítás nem hajtható végre.'
      );

      alert(
        'A set azonosítója hiányzik.'
      );

      return;
    }

    const data: Partial<UserWorkoutExerciseSetModel> = {

      setNumber:
      set.setNumber,

      targetRepetitions:
      set.targetRepetitions,

      targetWeightKg:
      set.targetWeightKg,

      actualRepetitions:
      set.actualRepetitions,

      actualWeightKg:
      set.actualWeightKg,

      completed:
      set.completed,

      notes:
      set.notes
    };

    console.log(
      'PUT data:',
      data
    );

    this.setService
      .updateSet(
        set.id,
        data
      )
      .subscribe({

        next: (response) => {

          console.log(
            '=== SET UPDATE SUCCESS ==='
          );

          console.log(
            'Backend response:',
            response
          );

          alert(
            `Set #${set.setNumber} sikeresen módosítva.`
          );
        },

        error: (err: any) => {

          console.error(
            '=== SET UPDATE ERROR ==='
          );

          console.error(
            'Hiba a set módosításakor:',
            err
          );

          alert(
            'Hiba történt a set módosításakor.'
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

          console.log(
            'Létrehozott user workout:',
            res
          );

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

    console.log(
      '=== LOAD USER PROGRAM ==='
    );

    console.log(
      'userId:',
      this.selectedUserId
    );

    console.log(
      'programId:',
      this.selectedProgramId
    );

    this.service
      .getUserProgramWithExercises(
        this.selectedUserId,
        this.selectedProgramId
      )
      .subscribe({
        next: data => {

          console.log(
            'raw user-program data:',
            data
          );

          console.log(
            'raw user-program data JSON:',
            JSON.stringify(data, null, 2)
          );

          console.log(
            'raw user-program data darabszáma:',
            data?.length ?? 0
          );

          this.userProgramData =
            data ?? [];

          this.dayGroups =
            this.groupByDayAndWorkout(
              this.userProgramData
            );

          console.log(
            'grouped:',
            this.dayGroups
          );

          console.log(
            'grouped JSON:',
            JSON.stringify(
              this.dayGroups,
              null,
              2
            )
          );
        },

        error: (err: any) => {

          console.error(
            '=== USER PROGRAM BACKEND ERROR ==='
          );

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

    console.log(
      '=== GROUP BY DAY / WORKOUT / EXERCISE ==='
    );

    console.log(
      'Kapott rows:',
      rows
    );

    const map = new Map<string, any>();

    for (const row of rows) {

      console.log(
        'Feldolgozott row:',
        row
      );

      console.log(
        'user_workout_exercise_id:',
        row.user_workout_exercise_id
      );

      const dateKey =
        row.scheduled_date ?? 'nincs_datum';

      if (!map.has(dateKey)) {

        map.set(dateKey, {
          date:
          row.scheduled_date,

          programDayIndex:
          row.program_day_index,

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

          workoutId:
          row.workout_id,

          workoutName:
          row.workout_name,

          workoutCompleted:
            row.workout_completed === true,

          exercises: []
        };

        dayObj.workouts.push(
          workout
        );
      }

      const exercise = {

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
      };

      console.log(
        'Létrehozott exercise objektum:',
        exercise
      );

      console.log(
        'Exercise → userWorkoutExerciseId:',
        exercise.userWorkoutExerciseId
      );

      workout.exercises.push(
        exercise
      );
    }

    const result =
      Array.from(map.values())
        .sort((a, b) => {

          if (a.date && b.date) {

            return a.date.localeCompare(
              b.date
            );
          }

          return (
            (a.programDayIndex ?? 0) -
            (b.programDayIndex ?? 0)
          );
        })
        .map(day => {

          day.workouts =
            day.workouts.map(
              (w: any) => {

                w.exercises =
                  w.exercises.sort(
                    (e1: any, e2: any) =>
                      (e1.order ?? 0) -
                      (e2.order ?? 0)
                  );

                return w;
              }
            );

          return day;
        });

    console.log(
      '=== GROUP BY RESULT ==='
    );

    console.log(
      'Végeredmény:',
      result
    );

    return result;
  }
}
