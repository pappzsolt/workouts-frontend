import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { WorkoutListComponent } from '../operations/coach-workouts/coach-workouts.component';
import { CoachProgramComponent } from '../operations/coach-programs/coach-program/coach-program.component';
import { ExerciseControllerComponent } from '../operations/coach-exercises/coach-exercises.component';

import { AssignProgramComponent } from '../operations/assign-program/assignprogram.component';
import { ProgramWorkoutsAssComponent } from '../operations/assign-program-workout/program-workouts-ass.component';
import { AssignWorkoutsExercisesComponent } from '../operations/assign-workouts-exercises/assign-workouts-exercises.component';

import { UserWorkoutExerciseManagerComponent } from '../operations/user-workout-exercise-manager/user-workout-exercise-manager';

import { SHARED_IMPORTS } from '../../shared/shared-imports';

@Component({
  selector: 'app-coach-dashboard',
  standalone: true,
  imports: [
    ...SHARED_IMPORTS,
    WorkoutListComponent,
    CoachProgramComponent,
    ExerciseControllerComponent,
    AssignProgramComponent,
    ProgramWorkoutsAssComponent,
    AssignWorkoutsExercisesComponent,
    UserWorkoutExerciseManagerComponent,
  ],
  templateUrl: './coach-dashboard.component.html',
  styleUrls: ['./coach-dashboard.component.css'],
})
export class CoachDashboardComponent implements OnInit {
  // =============================
  // PANEL ÁLLAPOTOK
  // =============================

  showWorkouts = false;

  showPrograms = false;

  showExercises = false;

  showAssignments = false;

  showProgramWorkouts = false;

  showWorkoutExercises = false;

  showWorkoutExerciseManager = false;

  // =============================
  // PROGRAM
  // =============================

  programIdForWorkouts?: number;

  constructor(private route: ActivatedRoute) {}

  // =============================
  // INIT
  // =============================

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      this.closeAllPanels();

      switch (params['section']) {
        case 'workouts':
          this.showWorkouts = true;
          break;

        case 'programs':
          this.showPrograms = true;
          break;

        case 'exercises':
          this.showExercises = true;
          break;

        case 'assignments':
          this.showAssignments = true;
          break;

        case 'program-workouts':
          this.showProgramWorkouts = true;
          break;

        case 'workout-exercise-manager':
          this.showWorkoutExerciseManager = true;
          break;
      }
    });
  }

  // =============================
  // PANEL KEZELÉS
  // =============================

  private closeAllPanels(): void {
    this.showWorkouts = false;

    this.showPrograms = false;

    this.showExercises = false;

    this.showAssignments = false;

    this.showProgramWorkouts = false;

    this.showWorkoutExercises = false;

    this.showWorkoutExerciseManager = false;
  }

  // =============================
  // WORKOUTS
  // =============================

  toggleWorkouts(): void {
    const shouldOpen = !this.showWorkouts;

    this.closeAllPanels();

    this.showWorkouts = shouldOpen;
  }

  // =============================
  // PROGRAMS
  // =============================

  togglePrograms(): void {
    const shouldOpen = !this.showPrograms;

    this.closeAllPanels();

    this.showPrograms = shouldOpen;
  }

  // =============================
  // EXERCISES
  // =============================

  toggleExercises(): void {
    const shouldOpen = !this.showExercises;

    this.closeAllPanels();

    this.showExercises = shouldOpen;
  }

  // =============================
  // ASSIGNMENTS
  // =============================

  toggleAssignments(): void {
    const shouldOpen = !this.showAssignments;

    this.closeAllPanels();

    this.showAssignments = shouldOpen;
  }

  // =============================
  // PROGRAM WORKOUTS
  // =============================

  toggleProgramWorkouts(): void {
    const shouldOpen = !this.showProgramWorkouts;

    this.closeAllPanels();

    this.showProgramWorkouts = shouldOpen;
  }

  // =============================
  // WORKOUT EXERCISES
  // =============================

  toggleWorkoutExercises(): void {
    const shouldOpen = !this.showWorkoutExercises;

    this.closeAllPanels();

    this.showWorkoutExercises = shouldOpen;
  }

  // =============================
  // WORKOUT EXERCISE MANAGER
  // =============================

  toggleWorkoutExerciseManager(): void {
    const shouldOpen = !this.showWorkoutExerciseManager;

    this.closeAllPanels();

    this.showWorkoutExerciseManager = shouldOpen;
  }
}
