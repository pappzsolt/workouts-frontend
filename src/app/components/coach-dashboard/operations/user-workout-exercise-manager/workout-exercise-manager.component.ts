import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WorkoutExerciseService } from '../../../../services/coach/workout-exercises.service';
import { WorkoutExerciseModel } from '../../../../models/workout-exercise.model';

@Component({
  selector: 'app-workout-exercise-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './workout-exercise-manager.component.html',
})
export class WorkoutExerciseManagerComponent implements OnInit {

  workoutExercises: WorkoutExerciseModel[] = [];
  selectedUserId?: number;
  selectedWorkoutId?: number;

  newWorkoutExercise: Partial<WorkoutExerciseModel> = {
    sets: 3,
    repetitions: 10,
    orderIndex: 1,
    restSeconds: 60,
    done: false
  };

  constructor(private service: WorkoutExerciseService) {}

  ngOnInit(): void {}

  /** 🔹 Lekérés user + workout alapján */
  loadWorkoutExercises() {
    if (this.selectedWorkoutId == null) {
      alert('Kérlek add meg a workoutId-t!');
      return;
    }
    this.service.getWorkoutExercisesByWorkoutId(this.selectedWorkoutId).subscribe(res => {
      this.workoutExercises = res?.data || [];
    });
  }

  /** 🔹 Új rekord hozzáadása / frissítése workout + exercise + user alapján */
  addWorkoutExercise() {
    if (!this.selectedUserId || !this.selectedWorkoutId || !this.newWorkoutExercise.exerciseId) {
      alert('Hiányzó adatok: userId, workoutId, exerciseId!');
      return;
    }
    this.service.updateByWorkoutAndExercise(
      this.selectedWorkoutId,
      this.newWorkoutExercise.exerciseId,
      this.selectedUserId,
      this.newWorkoutExercise
    ).subscribe({
      next: res => {
        alert('WorkoutExercise hozzáadva/frissítve!');
        this.loadWorkoutExercises();
        this.newWorkoutExercise = { sets: 3, repetitions: 10, orderIndex: 1, restSeconds: 60, done: false };
      },
      error: err => console.error(err)
    });
  }

  /** 🔹 Rekord törlése */
  deleteWorkoutExercise(id?: number) {
    if (id == null) return;
    this.service.deleteWorkoutExerciseById(id).subscribe({
      next: res => {
        alert('Rekord törölve!');
        this.loadWorkoutExercises();
      },
      error: err => console.error(err)
    });
  }

  /** 🔹 Rekord frissítése (id alapján) */
  updateWorkoutExercise(we: WorkoutExerciseModel) {
    if (we.id == null) return;
    this.service.updateWorkoutExercise(we).subscribe({
      next: res => {
        alert('Frissítve!');
        this.loadWorkoutExercises();
      },
      error: err => console.error(err)
    });
  }
}
