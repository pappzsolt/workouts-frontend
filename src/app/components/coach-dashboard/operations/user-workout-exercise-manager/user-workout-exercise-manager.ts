import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WorkoutExercisesManagerService } from '../../../../services/coach/workout-exercises-manager.service';
import { UserWorkoutExerciseDto } from '../../../../models/user-workout-exercise.dto';

@Component({
  selector: 'app-user-workout-exercise-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-workout-exercise-manager.component.html'
})
export class UserWorkoutExerciseManagerComponent implements OnInit {
  exercises: UserWorkoutExerciseDto[] = [];
  selectedUserWorkoutId?: number;
  newWorkoutExerciseId?: number;

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
      we.feedback ?? undefined,  // null => undefined
      we.notes ?? undefined      // null => undefined
    ).subscribe();
  }


  addExercise() {
    if (!this.selectedUserWorkoutId || !this.newWorkoutExerciseId) return;
    this.service.addUserWorkoutExercise(this.selectedUserWorkoutId, this.newWorkoutExerciseId)
      .subscribe(res => {
        this.exercises.push(res);
        this.newWorkoutExerciseId = undefined;
      });
  }

  deleteExercise(id?: number) {
    if (!id) return;
    // Delete metódus implementálása a service-ben szükséges
    console.warn('Delete not implemented yet for id:', id);
  }
}
