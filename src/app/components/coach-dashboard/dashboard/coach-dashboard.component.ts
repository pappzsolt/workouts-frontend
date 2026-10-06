import { Component, OnInit, DestroyRef, inject } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { WorkoutListComponent } from '../operations/coach-workouts/coach-workouts.component';
import { CoachProgramComponent } from '../operations/coach-programs/coach-program/coach-program.component';
import { ExerciseControllerComponent } from '../operations/coach-exercises/coach-exercises.component';
import { AssignWorkoutsExercisesComponent } from '../operations/assign-workouts-exercises/assign-workouts-exercises.component';
import { UserWorkoutExerciseManagerComponent } from '../operations/user-workout-exercise-manager/user-workout-exercise-manager';
import { AssignProgramComponent } from '../operations/assign-program/assignprogram.component';
import { ProgramWorkoutsAssComponent } from '../operations/assign-program-workout/program-workouts-ass.component';

import { SHARED_IMPORTS } from '../../shared/shared-imports';
import { DashboardActionComponent } from '../../shared/components/dashboard-action/dashboard-action.component';

@Component({
  selector: 'app-coach-dashboard',
  standalone: true,
  imports: [
    ...SHARED_IMPORTS,
    DashboardActionComponent,
    WorkoutListComponent,
    CoachProgramComponent,
    ExerciseControllerComponent,
    AssignWorkoutsExercisesComponent,
    UserWorkoutExerciseManagerComponent,
    ProgramWorkoutsAssComponent,
    AssignProgramComponent,
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

  exerciseNotFound = false;
  programBuilderMessage = '';
  private readonly location = inject(Location);

  // =============================
  // PROGRAM
  // =============================

  programIdForWorkouts?: number;

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  // =============================
  // INIT
  // =============================

  ngOnInit(): void {
    this.route.queryParams
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        this.closeAllPanels();
        const state = this.location.getState() as { programBuilderMessage?: unknown };
        this.programBuilderMessage = typeof state?.programBuilderMessage === 'string' ? state.programBuilderMessage : '';

        // ==========================================================
        // EXERCISE NEM TALÁLHATÓ
        // ==========================================================

        this.exerciseNotFound = params['exerciseNotFound'] === 'true';

        // ==========================================================
        // AKTUÁLIS DASHBOARD PANEL
        // ==========================================================

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

          case 'workout-exercises':
            this.showWorkoutExercises = true;
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

  private toggleSection(section: string, isOpen: boolean): void {
    void this.router.navigate(['/coach/dashboard'], {
      queryParams: { section: isOpen ? null : section },
    });
  }

  toggleWorkouts(): void {
    this.toggleSection('workouts', this.showWorkouts);
  }

  togglePrograms(): void {
    this.toggleSection('programs', this.showPrograms);
  }

  toggleAssignments(): void {
    this.toggleSection('assignments', this.showAssignments);
  }

  toggleExercises(): void {
    this.toggleSection('exercises', this.showExercises);
  }

  toggleWorkoutExercises(): void {
    this.toggleSection('workout-exercises', this.showWorkoutExercises);
  }

  toggleWorkoutExerciseManager(): void {
    this.toggleSection('workout-exercise-manager', this.showWorkoutExerciseManager);
  }
}
