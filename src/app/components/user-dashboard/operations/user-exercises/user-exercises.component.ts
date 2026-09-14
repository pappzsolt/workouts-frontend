import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { Observable, Subject, map, takeUntil } from 'rxjs';

import { UserExerciseService } from '../../../../services/user/user-exercise/user-exercise.service';
import { LanguageService } from '../../../../services/shared/language.service';

import { WorkoutExercise } from '../../../../models/exercise.model';

import { SHARED_IMPORTS } from '../../../shared/shared-imports';

@Component({
  standalone: true,
  selector: 'app-user-exercises',
  imports: [...SHARED_IMPORTS],
  styleUrl: './user-exercises.component.css',
  templateUrl: './user-exercises.component.html',
})
export class UserExercisesComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  workoutId!: number;

  programId!: number;

  workoutName!: string;

  exercises$!: Observable<WorkoutExercise[]>;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private exercisesService: UserExerciseService,
    private languageService: LanguageService,
  ) {}

  // ============================================================
  // INIT
  // ============================================================

  ngOnInit(): void {
    // ==========================================================
    // WORKOUT ID A ROUTE PARAMÉTERBŐL
    // ==========================================================

    this.workoutId = Number(this.route.snapshot.paramMap.get('workoutId'));

    // ==========================================================
    // NAVIGATION STATE
    // ==========================================================

    const navState = history.state;

    this.workoutName = navState?.workoutName || 'userExercises.unknownWorkout';

    this.programId = Number(navState?.programId);

    // ==========================================================
    // DEBUG
    // ==========================================================

    console.log('=== UserExercisesComponent ===');

    console.log('workoutId:', this.workoutId);

    console.log('programId:', this.programId);

    console.log('workoutName:', this.workoutName);

    console.log('navigation state:', navState);

    // ==========================================================
    // ID VALIDÁLÁS
    // ==========================================================

    if (Number.isNaN(this.workoutId) || this.workoutId <= 0) {
      console.error('Érvénytelen workout ID:', this.workoutId);

      return;
    }

    if (Number.isNaN(this.programId) || this.programId <= 0) {
      console.error('Érvénytelen program ID:', this.programId);

      return;
    }

    // ==========================================================
    // NYELVVÁLTÁS FIGYELÉSE
    //
    // A BehaviorSubject az aktuális nyelvet
    // azonnal kibocsátja, ezért az első
    // exercise betöltés is innen történik.
    // ==========================================================

    this.languageService.language$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.loadExercises();
    });
  }

  // ============================================================
  // EXERCISE-EK BETÖLTÉSE
  // ============================================================

  private loadExercises(): void {
    console.log('Exercise-ek betöltése:', {
      programId: this.programId,
      workoutId: this.workoutId,
    });

    this.exercises$ = this.exercisesService
      .getWorkoutExercises(this.programId, this.workoutId)
      .pipe(
        map((response) => {
          console.log('Workout exercise válasz:', response);

          return response.data?.exercises ?? [];
        }),
      );
  }

  // ============================================================
  // EXERCISE OLDALRA NAVIGÁLÁS
  // ============================================================

  goToExercise(exerciseId: number): void {
    this.router.navigate(['/user/workouts', this.workoutId, 'exercises', exerciseId], {
      state: {
        workoutName: this.workoutName,
        programId: this.programId,
      },
    });
  }

  // ============================================================
  // DESTROY
  // ============================================================

  ngOnDestroy(): void {
    this.destroy$.next();

    this.destroy$.complete();
  }
}
