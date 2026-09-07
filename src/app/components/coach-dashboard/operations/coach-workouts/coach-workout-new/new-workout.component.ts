import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { CoachWorkoutsService } from '../../../../../services/coach/coach-workouts/coach-workouts.service';
import { Workout } from '../../../../../models/workout.model';

import { SHARED_IMPORTS } from '../../../../shared/shared-imports';

@Component({
  selector: 'app-newworkout',
  templateUrl: './new-workout.component.html',
  styleUrls: ['./new-workout.component.css'],
  standalone: true,
  imports: [...SHARED_IMPORTS],
})
export class NewWorkoutComponent implements OnInit {
  workouts: Workout[] = [];

  newWorkout = {
    name: '',
    description: '',
    workoutDate: '',
    durationMinutes: 0,
    intensityLevel: '',
    done: false,
  };

  message: string = '';
  messageType: 'success' | 'error' | '' = '';

  constructor(
    private coachWorkoutsService: CoachWorkoutsService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    const fromProgramBuilder = this.route.snapshot.queryParamMap.get('fromProgramBuilder');

    const programId = this.route.snapshot.queryParamMap.get('programId');

    console.log('Program Builderből érkezett:', fromProgramBuilder);

    console.log('Program ID:', programId);

    this.loadWorkouts();
  }

  loadWorkouts(): void {
    this.coachWorkoutsService.getMyWorkouts().subscribe({
      next: (res) => {
        this.workouts = res || [];
      },

      error: (err) => {
        console.error('Hiba a workoutok betöltésekor', err);

        this.message = 'newWorkout.loadError';

        this.messageType = 'error';
      },
    });
  }

  addWorkout(): void {
    this.coachWorkoutsService.addWorkout(this.newWorkout).subscribe({
      next: (res) => {
        console.log('Workout létrehozás válasz:', res);

        console.log('Workout response.data:', res.data);

        this.message = 'newWorkout.createSuccess';

        this.messageType = 'success';

        // Megnézzük, hogy a Program Builderből
        // érkeztünk-e.
        const fromProgramBuilder = this.route.snapshot.queryParamMap.get('fromProgramBuilder');

        // Az aktuális program ID-ja.
        const programId = this.route.snapshot.queryParamMap.get('programId');

        // ==================================================
        // PROGRAM BUILDERBŐL ÉRKEZTÜNK
        // ==================================================

        if (fromProgramBuilder === 'true' && programId) {
          /**
           * A WorkoutResponse modell alapján
           * az új workout azonosítója:
           *
           * res.data.id
           */
          const workoutId = res.data?.id;

          console.log('Új workout létrehozva.', 'Workout ID:', workoutId, 'Program ID:', programId);

          if (workoutId === undefined || workoutId === null) {
            console.error('A workout létrejött, de a backend válaszában nincs workout ID.', res);

            this.message = 'newWorkout.createIdMissing';

            this.messageType = 'error';

            return;
          }

          console.log('Visszatérés a Program Builderbe az új workout ID-jával.');

          this.router.navigate(['/coach/program-builder'], {
            queryParams: {
              programId: programId,
              newWorkoutId: workoutId,
            },
          });

          return;
        }

        // ==================================================
        // NORMÁL WORKOUT LÉTREHOZÁS
        // ==================================================

        this.resetForm();

        this.loadWorkouts();
      },

      error: (err) => {
        console.error('Hiba a workout létrehozásakor:', err);

        this.message = 'newWorkout.createError';

        this.messageType = 'error';
      },
    });
  }

  private resetForm(): void {
    this.newWorkout = {
      name: '',
      description: '',
      workoutDate: '',
      durationMinutes: 0,
      intensityLevel: '',
      done: false,
    };
  }
}
