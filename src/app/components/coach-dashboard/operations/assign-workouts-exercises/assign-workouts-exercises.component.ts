import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CoachWorkoutBoardComponent } from '../../../shared/coach/coach-workouts-board/coach-workout-board.component';
import { CoachExercisesBoardComponent } from '../../../shared/coach/coach-exercises-board/coach-exercises-board.component';
import { Workout } from '../../../../models/workout.model';
import { Exercise } from '../../../../models/exercise.model';

@Component({
  selector: 'app-assign-workouts-exercises',
  standalone: true,
  imports: [CommonModule, FormsModule, CoachWorkoutBoardComponent, CoachExercisesBoardComponent],
  templateUrl: './assign-workouts-exercises.component.html',
})
export class AssignWorkoutsExercisesComponent implements OnInit {

  workouts: Workout[] = [];
  exercises: Exercise[] = [];

  // Wrapper szinten tárolt kiválasztott workoutok / exercise-ek
  selectedWorkoutIds: number[] = [];
  selectedExercises: Exercise[] = [];

  @Output() assignedWorkouts = new EventEmitter<number[]>();
  @Output() assignedExercises = new EventEmitter<Exercise[]>();

  constructor() {}

  ngOnInit(): void {}

  /** CoachWorkoutBoardComponent változás kezelése */
  onWorkoutsChange(updatedIds: number[]) {
    const prevSelectedWorkouts = [...this.selectedWorkoutIds];
    this.selectedWorkoutIds = [...updatedIds];

    // Ha változott a kiválasztás, reseteljük az exercise kijelöléseket
    if (JSON.stringify(prevSelectedWorkouts) !== JSON.stringify(this.selectedWorkoutIds)) {
      this.selectedExercises = [];
      this.assignedExercises.emit(this.selectedExercises);
    }

    console.log('Selected workouts:', this.selectedWorkoutIds);
    this.assignedWorkouts.emit(this.selectedWorkoutIds);
  }

  /** CoachExercisesBoardComponent változás kezelése */
  onExercisesChange(updatedExercises: Exercise[]) {
    this.selectedExercises = [...updatedExercises];
    console.log('Selected exercises:', this.selectedExercises);
    this.assignedExercises.emit(this.selectedExercises);
  }

  // Manuális eltávolítás gombhoz
  removeWorkout(wid: number) {
    this.selectedWorkoutIds = this.selectedWorkoutIds.filter(id => id !== wid);
    this.onWorkoutsChange(this.selectedWorkoutIds);
  }

  removeExercise(eid: number) {
    this.selectedExercises = this.selectedExercises.filter(e => e.id !== eid);
    this.onExercisesChange(this.selectedExercises);
  }

  // Mentés (backend hívás majd később)
  saveSelectedWorkoutsAndExercises() {
    console.log('🚀 Mentés backendhez:', {
      workouts: this.selectedWorkoutIds,
      exercises: this.selectedExercises
    });
    // TODO: ide jön a backend hívás
  }
}
