import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WorkoutExercisesManagerService } from '../../../../services/coach/workout-exercises-manager.service';
import { UserWorkoutExerciseDto } from '../../../../models/user-workout-exercise.dto';
import { UserSelectComponent } from '../../../shared/user/user-select.component';
import {WorkoutSelectComponent} from '../../../shared/workout/workout-select.component';


@Component({
  selector: 'app-user-workout-exercise-manager',
  standalone: true,
  imports: [CommonModule, FormsModule,UserSelectComponent,WorkoutSelectComponent],
  templateUrl: './user-workout-exercise-manager.component.html'
})
export class UserWorkoutExerciseManagerComponent implements OnInit {
  exercises: UserWorkoutExerciseDto[] = [];
  selectedUserWorkoutId?: number;
  newWorkoutExerciseId?: number;

  // 🔹 Új mezők a user_workout létrehozásához
  selectedUserId?: number;
  selectedWorkoutId?: number;
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
  addExercise() {
    // Ha már létezik a user_workout ID
    if (this.selectedUserWorkoutId && this.newWorkoutExerciseId) {
      this.service.addUserWorkoutExercise(this.selectedUserWorkoutId, this.newWorkoutExerciseId)
        .subscribe(res => {
          this.exercises.push(res);
          this.newWorkoutExerciseId = undefined;
        });
      return;
    }

    // Ha új user_workout-ot kell létrehozni
    if (!this.selectedUserId || !this.selectedWorkoutId) {
      alert('Hiányzó adatok: userId vagy workoutId!');
      return;
    }

    // új user_workout létrehozása backendhez
    this.service.addUserWorkout(this.selectedUserId, this.selectedWorkoutId, this.scheduledAt)
      .subscribe(res => {
        this.exercises = res; // az összes új exercise-t visszaadja
        this.selectedUserWorkoutId = res.length > 0 ? res[0].userWorkoutId : undefined;
        this.newWorkoutExerciseId = undefined;
      });
  }

  deleteExercise(id?: number) {
    if (!id) return;
    // Delete metódus implementálása a service-ben szükséges
    console.warn('Delete not implemented yet for id:', id);
  }
}
