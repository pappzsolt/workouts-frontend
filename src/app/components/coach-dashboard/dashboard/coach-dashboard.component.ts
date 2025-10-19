import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule, NgIf } from '@angular/common';
import { WorkoutListComponent } from '../operations/coach-workouts/coach-workouts.component';
import { CoachProgramComponent } from '../operations/coach-programs/coach-program/coach-program.component';
import { ExerciseControllerComponent } from '../operations/coach-exercises/coach-exercises.component';
import { AssignProgramComponent } from '../../../components/coach-dashboard/operations/assign-program/assignprogram.component';
import {ProgramWorkoutsAssComponent} from '../operations/assign-program-workout/program-workouts-ass.component';

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

  programIdForWorkouts?: number;
  programIdForPrograms?: number;

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

  toggleWorkouts() {
    this.showWorkouts = !this.showWorkouts;
    this.showPrograms = false;
    this.showExercises = false;
    this.showAssignments = false;
    this.showProgramWorkouts = false;
  }

  togglePrograms() {
    this.showPrograms = !this.showPrograms;
    this.showWorkouts = false;
    this.showExercises = false;
    this.showAssignments = false;
    this.showProgramWorkouts = false;
  }

  toggleExercises() {
    this.showExercises = !this.showExercises;
    this.showWorkouts = false;
    this.showPrograms = false;
    this.showAssignments = false;
    this.showProgramWorkouts = false;
  }

  toggleAssignments() {
    this.showAssignments = !this.showAssignments;
    this.showPrograms = false;
    this.showWorkouts = false;
    this.showExercises = false;
    this.showProgramWorkouts = false;
  }

  // 🔹 Üres toggle függvény a Program-Workouts ASS csempéhez
  toggleProgramWorkouts() {
    this.showProgramWorkouts = !this.showProgramWorkouts;
    this.showPrograms = false;
    this.showWorkouts = false;
    this.showExercises = false;
    this.showAssignments = false;
  }

  navigateTo(path: string) {
    this.router.navigate([path]);
  }
}
