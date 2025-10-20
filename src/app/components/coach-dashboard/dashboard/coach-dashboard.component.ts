import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule, NgIf } from '@angular/common';
import { WorkoutListComponent } from '../operations/coach-workouts/coach-workouts.component';
import { CoachProgramComponent } from '../operations/coach-programs/coach-program/coach-program.component';
import { ExerciseControllerComponent } from '../operations/coach-exercises/coach-exercises.component';
import { AssignProgramComponent } from '../../../components/coach-dashboard/operations/assign-program/assignprogram.component';
import { ProgramWorkoutsAssComponent } from '../operations/assign-program-workout/program-workouts-ass.component';
import { AssignWorkoutsExercisesComponent } from '../operations/assign-workouts-exercises/assign-workouts-exercises.component';

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
  ],
  templateUrl: './coach-dashboard.component.html',
  styleUrls: ['./coach-dashboard.component.css']
})
export class CoachDashboardComponent implements OnInit {
  showWorkouts: boolean = false;
  showPrograms: boolean = false;
  showExercises: boolean = false;
  showAssignments: boolean = false;
  showProgramWorkouts: boolean = false;  // új csempe toggle
  showWorkoutExercises = false;
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
}
