import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule, NgIf } from '@angular/common';
import { WorkoutListComponent } from '../operations/coach-workouts/coach-workouts.component';
import { CoachProgramComponent } from '../operations/coach-programs/coach-program/coach-program.component';
import { ExerciseControllerComponent } from '../operations/coach-exercises/coach-exercises.component';
import { AssignProgramComponent } from '../../../components/coach-dashboard/operations/assign-program/assignprogram.component';
import { ProgramWorkoutsAssComponent } from '../operations/assign-program-workout/program-workouts-ass.component';
import { AssignWorkoutsExercisesComponent } from '../operations/assign-workouts-exercises/assign-workouts-exercises.component';
import { WorkoutExerciseManagerComponent } from "../../../components/coach-dashboard/operations/user-workout-exercise-manager/workout-exercise-manager.component";

@Component({
  selector: 'app-coach-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    NgIf,
    WorkoutListComponent,
    CoachProgramComponent,
    ExerciseControllerComponent,
    AssignProgramComponent,
    ProgramWorkoutsAssComponent,
    AssignWorkoutsExercisesComponent,
    WorkoutExerciseManagerComponent,
  ],
  templateUrl: './coach-dashboard.component.html',
  styleUrls: ['./coach-dashboard.component.css']
})
export class CoachDashboardComponent implements OnInit {
  showWorkouts: boolean = false;
  showPrograms: boolean = false;
  showExercises: boolean = false;
  showAssignments: boolean = false;
  showProgramWorkouts: boolean = false;
  showWorkoutExercises: boolean = false;
  showWorkoutExerciseManager: boolean = false; // ✅ új toggle
  programIdForWorkouts?: number;

  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['section'] === 'workouts') this.showWorkouts = true;
      if (params['section'] === 'programs') this.showPrograms = true;
      if (params['section'] === 'exercises') this.showExercises = true;
      if (params['section'] === 'assignments') this.showAssignments = true;
      if (params['section'] === 'program-workouts') this.showProgramWorkouts = true;
      if (params['section'] === 'workout-exercise-manager') this.showWorkoutExerciseManager = true; // ✅ query param alapján nyitható
    });
  }

  // 🔹 Segédfüggvény: minden panelt bezár
  private closeAllPanels() {
    this.showPrograms = false;
    this.showWorkouts = false;
    this.showExercises = false;
    this.showAssignments = false;
    this.showProgramWorkouts = false;
    this.showWorkoutExercises = false;
    this.showWorkoutExerciseManager = false; // ✅ bezárás
  }

  toggleWorkouts() {
    this.closeAllPanels();
    this.showWorkouts = !this.showWorkouts;
  }

  togglePrograms() {
    this.closeAllPanels();
    this.showPrograms = !this.showPrograms;
  }

  toggleExercises() {
    this.closeAllPanels();
    this.showExercises = !this.showExercises;
  }

  toggleAssignments() {
    this.closeAllPanels();
    this.showAssignments = !this.showAssignments;
  }

  toggleProgramWorkouts() {
    this.closeAllPanels();
    this.showProgramWorkouts = !this.showProgramWorkouts;
  }

  toggleWorkoutExercises() {
    this.closeAllPanels();
    this.showWorkoutExercises = !this.showWorkoutExercises;
  }

  // ✅ Új toggle: WorkoutExerciseManager
  toggleWorkoutExerciseManager() {
    this.closeAllPanels();
    this.showWorkoutExerciseManager = !this.showWorkoutExerciseManager;
  }
}
