import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';

import { WorkoutListComponent } from '../operations/coach-workouts/coach-workouts.component';
import { CoachProgramComponent } from '../operations/coach-programs/coach-program/coach-program.component';
import { ExerciseControllerComponent } from '../operations/coach-exercises/coach-exercises.component';
import { AssignProgramComponent } from '../../../components/coach-dashboard/operations/assign-program/assignprogram.component';
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
  showWorkouts: boolean = false;
  showPrograms: boolean = false;
  showExercises: boolean = false;
  showAssignments: boolean = false;
  showProgramWorkouts: boolean = false;
  showWorkoutExercises: boolean = false;
  showWorkoutExerciseManager: boolean = false;
  programIdForWorkouts?: number;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      if (params['section'] === 'workouts') this.showWorkouts = true;
      if (params['section'] === 'programs') this.showPrograms = true;
      if (params['section'] === 'exercises') this.showExercises = true;
      if (params['section'] === 'assignments') this.showAssignments = true;
      if (params['section'] === 'program-workouts') {
        this.showProgramWorkouts = true;
      }
      if (params['section'] === 'workout-exercise-manager') {
        this.showWorkoutExerciseManager = true;
      }
    });
  }

  // Segédfüggvény: minden panelt bezár
  private closeAllPanels(): void {
    this.showPrograms = false;
    this.showWorkouts = false;
    this.showExercises = false;
    this.showAssignments = false;
    this.showProgramWorkouts = false;
    this.showWorkoutExercises = false;
    this.showWorkoutExerciseManager = false;
  }

  toggleWorkouts(): void {
    this.closeAllPanels();
    this.showWorkouts = !this.showWorkouts;
  }

  togglePrograms(): void {
    this.closeAllPanels();
    this.showPrograms = !this.showPrograms;
  }

  toggleExercises(): void {
    this.closeAllPanels();
    this.showExercises = !this.showExercises;
  }

  toggleAssignments(): void {
    this.closeAllPanels();
    this.showAssignments = !this.showAssignments;
  }

  toggleProgramWorkouts(): void {
    this.closeAllPanels();
    this.showProgramWorkouts = !this.showProgramWorkouts;
  }

  toggleWorkoutExercises(): void {
    this.closeAllPanels();
    this.showWorkoutExercises = !this.showWorkoutExercises;
  }

  // Új toggle: WorkoutExerciseManager
  toggleWorkoutExerciseManager(): void {
    this.closeAllPanels();
    this.showWorkoutExerciseManager = !this.showWorkoutExerciseManager;
  }
}
