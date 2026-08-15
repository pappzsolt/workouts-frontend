import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import { CoachWorkoutBoardComponent } from '../../../shared/coach/coach-workouts-board/coach-workout-board.component';
import { CoachExercisesBoardComponent } from '../../../shared/coach/coach-exercises-board/coach-exercises-board.component';

import { Workout } from '../../../../models/workout.model';
import { Exercise } from '../../../../models/exercise.model';
import { WorkoutExerciseService } from '../../../../services/coach/workout-exercises.service';
import { SavedWorkoutExercise } from '../../../../models/workout-exercise.model';

@Component({
  selector: 'app-assign-workouts-exercises',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CoachWorkoutBoardComponent,
    CoachExercisesBoardComponent
  ],
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

  constructor(
    private workoutExerciseService: WorkoutExerciseService
  ) {}

  ngOnInit(): void {}

  onWorkoutsChange(updatedIds: number[]): void {
    const prevSelectedWorkouts = [...this.selectedWorkoutIds];

    this.selectedWorkoutIds = [...updatedIds];

    if (
      JSON.stringify(prevSelectedWorkouts) !==
      JSON.stringify(this.selectedWorkoutIds)
    ) {
      this.selectedExercises = [];
      this.assignedExercises.emit(this.selectedExercises);
    }

    console.log('Selected workouts:', this.selectedWorkoutIds);

    this.assignedWorkouts.emit(this.selectedWorkoutIds);

    if (this.selectedWorkoutIds.length > 0) {
      const workoutId = this.selectedWorkoutIds[0];

      // Betöltjük a már mentett workout-exercise kapcsolatokat
      this.loadSavedWorkoutExercises(workoutId);
    } else {
      this.savedWorkoutExercises = [];
      this.selectedExercises = [];

      this.assignedExercises.emit(this.selectedExercises);
    }
  }

  onExercisesChange(updatedExercises: Exercise[]): void {
    this.selectedExercises = [...updatedExercises];

    console.log('Selected exercises:', this.selectedExercises);

    this.assignedExercises.emit(this.selectedExercises);
  }

  removeWorkout(wid: number): void {
    this.selectedWorkoutIds =
      this.selectedWorkoutIds.filter(id => id !== wid);

    this.onWorkoutsChange(this.selectedWorkoutIds);
  }

  removeExercise(eid: number): void {
    this.selectedExercises =
      this.selectedExercises.filter(e => e.id !== eid);

    this.onExercisesChange(this.selectedExercises);
  }

  saveSelectedWorkoutsAndExercises(): void {
    console.log('🚀 Mentés backendhez:', {
      workouts: this.selectedWorkoutIds,
      exercises: this.selectedExercises
    });

    for (const workoutId of this.selectedWorkoutIds) {

      for (const exercise of this.selectedExercises) {

        if (exercise.id == null) {
          continue;
        }

        this.workoutExerciseService
          .addWorkoutExerciseSimple(workoutId, exercise.id)
          .subscribe({
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

            error: (err: HttpErrorResponse) => {
              console.error('Mentés hiba:', err);

              if (err.error) {
                console.error('Backend válasz:', err.error);
              }
            }
          });
      }
    }
  }

  /**
   * Mentett workout-exercise kapcsolatok betöltése workoutId alapján
   */
  loadSavedWorkoutExercises(workoutId: number): void {

    if (!workoutId || workoutId <= 0) {
      return;
    }

    this.workoutExerciseService
      .getWorkoutExercisesByWorkoutId(workoutId)
      .subscribe({

        next: (res: any) => {

          // A backend válaszából csak a data tömb kell
          this.savedWorkoutExercises = res.data || [];

          console.log(
            'Mentett kapcsolatok betöltve:',
            this.savedWorkoutExercises
          );

          // Frissítjük a kiválasztott exercise-eket
          this.selectedExercises = this.exercises.filter(e =>
            this.savedWorkoutExercises.some(
              (s: SavedWorkoutExercise) => s.exerciseId === e.id
            )
          );

          // Output esemény frissítése
          this.assignedExercises.emit(this.selectedExercises);
        },

        error: (err: HttpErrorResponse) => {
          console.error(
            'Mentett kapcsolatok betöltése hiba:',
            err
          );

          if (err.error) {
            console.error('Backend válasz:', err.error);
          }
        }
      });
  }

  /**
   * Workout-exercise kapcsolat törlése ID alapján
   */
  deleteWorkoutExerciseById(id: number): void {

    this.workoutExerciseService
      .deleteWorkoutExerciseById(id)
      .subscribe({

        next: (res: any) => {
          console.log('Törlés sikeres:', res);
        },

        error: (err: HttpErrorResponse) => {
          console.error('Törlés hiba:', err);

          if (err.error) {
            console.error('Backend válasz:', err.error);
          }
        }
      });
  }

  removeSavedWorkoutExercise(id: number): void {

    this.deleteWorkoutExerciseById(id);

    this.savedWorkoutExercises =
      this.savedWorkoutExercises.filter(w => w.id !== id);
  }
}
