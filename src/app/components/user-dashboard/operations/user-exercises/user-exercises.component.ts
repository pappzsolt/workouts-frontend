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

  ngOnInit(): void {
    /*
     * Route paraméterek
     */
    this.workoutId = Number(this.route.snapshot.paramMap.get('workoutId'));

    /*
     * A workout neve és a program ID
     * a navigation state-ből érkezik.
     */
    const navState = history.state;

    this.workoutName = navState['workoutName'] || 'userExercises.unknownWorkout';

    this.programId = Number(navState['programId']);

    /*
     * Exercise-ek betöltése.
     */
    this.loadExercises();

    /*
     * Nyelvváltás figyelése.
     */
    this.languageService.language$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.loadExercises();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /*
   * Workout exercise-ek lekérése.
   */
  private loadExercises(): void {
    this.exercises$ = this.exercisesService
      .getWorkoutExercises(this.programId, this.workoutId)
      .pipe(
        map((response) => {
          return response.data.exercises;
        }),
      );
  }

  goToExercise(exerciseId: number): void {
    this.router.navigate(['/user/workouts', this.workoutId, 'exercises', exerciseId], {
      state: {
        workoutName: this.workoutName,
        programId: this.programId,
      },
    });
  }
}
