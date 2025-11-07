import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WorkoutExercisesManagerService } from '../../../../services/coach/workout-exercises-manager.service';
import { UserWorkoutExerciseDto } from '../../../../models/user-workout-exercise.dto';
import { UserSelectComponent } from '../../../shared/user/user-select.component';
import { CoachProgramSelectComponent } from '../../../shared/programs/coach-program-select.component';

@Component({
  selector: 'app-user-workout-exercise-manager',
  standalone: true,
  imports: [CommonModule, FormsModule, UserSelectComponent, CoachProgramSelectComponent],
  templateUrl: './user-workout-exercise-manager.component.html'
})
export class UserWorkoutExerciseManagerComponent implements OnInit {
  exercises: UserWorkoutExerciseDto[] = [];
  selectedUserWorkoutId?: number;
  newWorkoutExerciseId?: number;

  // 🔹 Új mezők a user_workout létrehozásához
  selectedUserId?: number;
  selectedProgramId?: number;  // ezt küldjük az új lekérdezéshez is
  scheduledAt?: string;        // ISO string (yyyy-MM-dd)

  // 🔹 az új JOIN-os végpont eredménye ide kerül (lapos lista)
  userProgramData: any[] = [];

  // 🔹 átalakított, napokra bontott struktúra
  dayGroups: any[] = [];

  constructor(private service: WorkoutExercisesManagerService) {}

  ngOnInit(): void {}

  /** régi endpoint: /api/user-workout-exercises/workout/{id} */
  loadExercises() {
    if (!this.selectedUserWorkoutId) return;
    this.service.getExercisesForUserWorkout(this.selectedUserWorkoutId)
      .subscribe(res => this.exercises = res);
  }

  updateCompleted(we: UserWorkoutExerciseDto) {
    if (!we.id) return;
    this.service.updateCompleted(we.id, we.completed!)
      .subscribe();
  }

  updateDetails(we: UserWorkoutExerciseDto) {
    if (!we.id) return;
    this.service.updateDetails(
      we.id,
      we.setsDone || 0,
      we.feedback ?? undefined,
      we.notes ?? undefined
    ).subscribe();
  }

  /** 🔹 Új user_workout + exercise hozzáadása egyszerre (a backend most programId-t vár workoutId néven) */
  addUserWorkouts() {
    if (!this.selectedUserId || !this.selectedProgramId) {
      alert('Hiányzó adatok: userId vagy programId!');
      return;
    }

    this.service.addUserWorkout(this.selectedUserId, this.selectedProgramId, this.scheduledAt)
      .subscribe(res => {
        this.selectedUserWorkoutId = res.userWorkoutId;
        this.newWorkoutExerciseId = undefined;
      });
  }

  /** 🔹 Az új backend végpont meghívása: GET /api/user-workout-exercises/user-program/{userId}/{programId} */
  loadUserProgramWithExercises() {
    if (!this.selectedUserId || !this.selectedProgramId) {
      alert('Előbb válassz usert és programot!');
      return;
    }

    this.service.getUserProgramWithExercises(this.selectedUserId, this.selectedProgramId)
      .subscribe({
        next: data => {
          // lapos lista
          this.userProgramData = data;
          // csoportosított nézet
          this.dayGroups = this.groupByDayAndWorkout(data);
          // debughoz:
          console.log('raw user-program data:', data);
          console.log('grouped:', this.dayGroups);
        },
        error: err => {
          console.error('Hiba a program + exercises lekérésekor', err);
          this.userProgramData = [];
          this.dayGroups = [];
        }
      });
  }

  /**
   * 🔹 lapos listából: nap -> workout -> exercise
   * a backend snake_case kulcsokat küld (scheduled_date, program_day_index, workout_id, ...),
   * ezért itt is ezeket használjuk!
   */
  private groupByDayAndWorkout(rows: any[]): any[] {
    const map = new Map<string, any>();

    for (const row of rows) {
      // amit a backend küld:
      // row.scheduled_date
      // row.program_day_index
      // row.workout_id
      // row.workout_name
      // row.workout_exercise_id
      // row.exercise_order
      // row.exercise_id
      // row.exercise_name
      // row.workout_completed
      // row.exercise_completed
      // row.sets_done
      // row.feedback
      // row.notes
      // row.performed_at

      const dateKey = row.scheduled_date ?? 'nincs_datum';

      if (!map.has(dateKey)) {
        map.set(dateKey, {
          date: row.scheduled_date,
          programDayIndex: row.program_day_index,
          workouts: []
        });
      }
      const dayObj = map.get(dateKey);

      // adott nap adott workoutja
      let workout = dayObj.workouts.find((w: any) => w.workoutId === row.workout_id);
      if (!workout) {
        workout = {
          workoutId: row.workout_id,
          workoutName: row.workout_name,
          workoutCompleted: row.workout_completed === true,
          exercises: []
        };
        dayObj.workouts.push(workout);
      }

      // exercise hozzáadása a workouthoz
      workout.exercises.push({
        workoutExerciseId: row.workout_exercise_id,
        order: row.exercise_order,
        exerciseId: row.exercise_id,
        exerciseName: row.exercise_name,
        exerciseCompleted: row.exercise_completed === true,
        setsDone: row.sets_done,
        feedback: row.feedback,
        notes: row.notes,
        performedAt: row.performed_at
      });
    }

    // napok rendezése dátum szerint, ha nincs dátum, akkor program_nap szerint
    return Array.from(map.values())
      .sort((a, b) => {
        if (a.date && b.date) {
          return a.date.localeCompare(b.date);
        }
        return (a.programDayIndex ?? 0) - (b.programDayIndex ?? 0);
      })
      .map(day => {
        // minden napon belül a workout exercise-eket sorrendbe tesszük
        day.workouts = day.workouts.map((w: any) => {
          w.exercises = w.exercises.sort(
            (e1: any, e2: any) => (e1.order ?? 0) - (e2.order ?? 0)
          );
          return w;
        });
        return day;
      });
  }
}
