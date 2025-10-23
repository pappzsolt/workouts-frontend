import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CoachWorkoutBoardComponent } from '../../../shared/coach/coach-workouts-board/coach-workout-board.component';
import { CoachExercisesBoardComponent } from '../../../shared/coach/coach-exercises-board/coach-exercises-board.component';
import { Workout } from '../../../../models/workout.model';
import { Exercise } from '../../../../models/exercise.model';
import { WorkoutExerciseService } from '../../../../services/coach/workout-exercises.service';
import { SavedWorkoutExercise } from '../../../../models/workout-exercise.model';

@Component({
  selector: 'app-assign-workouts-exercises',
  standalone: true,
  imports: [CommonModule, FormsModule, CoachWorkoutBoardComponent, CoachExercisesBoardComponent],
  templateUrl: './assign-workouts-exercises.component.html',
})
export class AssignWorkoutsExercisesComponent implements OnInit {

  workouts: Workout[] = [];
  exercises: Exercise[] = [];

  selectedWorkoutIds: number[] = [];
  selectedExercises: Exercise[] = [];

  savedWorkoutExercises: SavedWorkoutExercise[] = [];

  @Output() assignedWorkouts = new EventEmitter<number[]>();
  @Output() assignedExercises = new EventEmitter<Exercise[]>();

  constructor(private workoutExerciseService: WorkoutExerciseService) {}

  ngOnInit(): void {}

  onWorkoutsChange(updatedIds: number[]) {
    const prevSelectedWorkouts = [...this.selectedWorkoutIds];
    this.selectedWorkoutIds = [...updatedIds];

    if (JSON.stringify(prevSelectedWorkouts) !== JSON.stringify(this.selectedWorkoutIds)) {
      this.selectedExercises = [];
      this.assignedExercises.emit(this.selectedExercises);
    }

    console.log('Selected workouts:', this.selectedWorkoutIds);
    this.assignedWorkouts.emit(this.selectedWorkoutIds);

    if (this.selectedWorkoutIds.length > 0) {
      const workoutId = this.selectedWorkoutIds[0];

      // 🔹 Betöltjük a mentett kapcsolatokat
      this.loadSavedWorkoutExercises(workoutId);
    } else {
      this.savedWorkoutExercises = [];
      this.selectedExercises = [];
      this.assignedExercises.emit(this.selectedExercises);
    }
  }




  onExercisesChange(updatedExercises: Exercise[]) {
    this.selectedExercises = [...updatedExercises];
    console.log('Selected exercises:', this.selectedExercises);
    this.assignedExercises.emit(this.selectedExercises);
  }

  removeWorkout(wid: number) {
    this.selectedWorkoutIds = this.selectedWorkoutIds.filter(id => id !== wid);
    this.onWorkoutsChange(this.selectedWorkoutIds);
  }

  removeExercise(eid: number) {
    this.selectedExercises = this.selectedExercises.filter(e => e.id !== eid);
    this.onExercisesChange(this.selectedExercises);
  }

  saveSelectedWorkoutsAndExercises() {
    console.log('🚀 Mentés backendhez:', {
      workouts: this.selectedWorkoutIds,
      exercises: this.selectedExercises
    });

    for (const workoutId of this.selectedWorkoutIds) {
      for (const exercise of this.selectedExercises) {
        if (exercise.id == null) continue;

        this.workoutExerciseService.addWorkoutExerciseSimple(workoutId, exercise.id).subscribe({
          next: (res: any) => {
            console.log('Mentés sikeres:', res);

            const savedObj: SavedWorkoutExercise = {
              id: res.id ?? 0,
              workoutId: workoutId,
              exerciseId: exercise.id!,
              workoutName: res.workoutName ?? '',
              exerciseName: res.exerciseName ?? '',
              status: res.status,
              message: res.message
            };

            this.savedWorkoutExercises.push(savedObj);
          },
          error: (err) => console.error('Mentés hiba:', err)
        });
      }
    }
  }

  /** 🔹 Betöltés workoutId alapján */
  loadSavedWorkoutExercises(workoutId: number) {
    if (!workoutId || workoutId <= 0) return;

    this.workoutExerciseService.getWorkoutExercisesByWorkoutId(workoutId).subscribe({
      next: (res: any) => {
        // 🔹 Csak a data tömb kell
        this.savedWorkoutExercises = res.data || [];
        console.log('Mentett kapcsolatok betöltve:', this.savedWorkoutExercises);

        // 🔹 Frissítjük a selectedExercises-t a pipákhoz
        this.selectedExercises = this.exercises.filter(e =>
          this.savedWorkoutExercises.some((s: any) => s.exerciseId === e.id)
        );

        // 🔹 Frissítjük az Output eseményt
        this.assignedExercises.emit(this.selectedExercises);
      },
      error: (err) => console.error('Mentett kapcsolatok betöltése hiba:', err)
    });
  }


  /** 🔹 Törlés ID alapján */
  deleteWorkoutExerciseById(id: number) {
    this.workoutExerciseService.deleteWorkoutExerciseById(id).subscribe({
      next: (res) => console.log('Törlés sikeres:', res),
      error: (err) => console.error('Törlés hiba:', err)
    });
  }

  removeSavedWorkoutExercise(id: number) {
    this.deleteWorkoutExerciseById(id);
    this.savedWorkoutExercises = this.savedWorkoutExercises.filter(w => w.id !== id);
  }

}
