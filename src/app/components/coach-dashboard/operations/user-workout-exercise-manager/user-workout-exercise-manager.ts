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
  selectedProgramId?: number;  // programId küldése a backendnek
  scheduledAt?: string; // ISO string

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

    // új user_workout létrehozása program_id alapján
    this.service.addUserWorkout(this.selectedUserId, this.selectedProgramId, this.scheduledAt)
      .subscribe(res => {
        this.selectedUserWorkoutId = res.userWorkoutId;
        this.newWorkoutExerciseId = undefined;
      });
  }
}
