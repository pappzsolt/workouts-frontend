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
  scheduledAt?: string; // ISO string

  // 🔹 az új JOIN-os végpont eredménye ide kerül
  userProgramData: any[] = [];

  constructor(private service: WorkoutExercisesManagerService) {}

  ngOnInit(): void {}

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

  /** 🔹 Új user_workout + exercise hozzáadása egyszerre */
  addUserWorkouts() {
    if (!this.selectedUserId || !this.selectedProgramId) {
      alert('Hiányzó adatok: userId vagy programId!');
      return;
    }

    // a backend most a programId-t várja workoutId néven, ezt már így használod
    this.service.addUserWorkout(this.selectedUserId, this.selectedProgramId, this.scheduledAt)
      .subscribe(res => {
        this.selectedUserWorkoutId = res.userWorkoutId;
        this.newWorkoutExerciseId = undefined;
      });
  }

  /** 🔹 Az új backend végpont meghívása: /api/user-workout-exercises/user-program/{userId}/{programId} */
  loadUserProgramWithExercises() {
    if (!this.selectedUserId || !this.selectedProgramId) {
      alert('Előbb válassz usert és programot!');
      return;
    }

    this.service.getUserProgramWithExercises(this.selectedUserId, this.selectedProgramId)
      .subscribe({
        next: data => {
          this.userProgramData = data;
        },
        error: err => {
          console.error('Hiba a program + exercises lekérésekor', err);
          this.userProgramData = [];
        }
      });
  }
}
