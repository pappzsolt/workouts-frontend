import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule, NgIf } from '@angular/common';
import { WorkoutListComponent } from '../operations/coach-workouts/coach-workouts.component';
import { CoachProgramComponent } from '../operations/coach-programs/coach-program/coach-program.component';
import { ExerciseControllerComponent } from '../operations/coach-exercises/coach-exercises.component';

@Component({
  selector: 'app-coach-dashboard',
  standalone: true,
  imports: [CommonModule, NgIf, WorkoutListComponent, CoachProgramComponent, ExerciseControllerComponent],
  templateUrl: './coach-dashboard.component.html',
  styleUrls: ['./coach-dashboard.component.css']
})
export class CoachDashboardComponent implements OnInit {
  showWorkouts: boolean = false;      // workout lista toggle
  showPrograms: boolean = false;      // program lista toggle
  showExercises: boolean = false;     // exercise lista toggle

  programIdForWorkouts?: number;      // melyik programhoz mutassuk a workoutokat
  programIdForPrograms?: number;      // opcionális, ha programhoz akarunk részleteket

  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['section'] === 'workouts') {
        this.showWorkouts = true;
      }
      if (params['section'] === 'programs') {
        this.showPrograms = true;
      }
      if (params['section'] === 'exercises') {
        this.showExercises = true;
      }
    });
  }

  // Workouts csempe toggle
  toggleWorkouts() {
    this.showWorkouts = !this.showWorkouts;
    this.showPrograms = false;
    this.showExercises = false;
  }

  // Programs csempe toggle
  togglePrograms() {
    this.showPrograms = !this.showPrograms;
    this.showWorkouts = false;
    this.showExercises = false;
  }

  // Exercises csempe toggle
  toggleExercises() {
    this.showExercises = !this.showExercises;
    this.showWorkouts = false;
    this.showPrograms = false;
  }

  navigateTo(path: string) {
    this.router.navigate([path]);
  }
}
