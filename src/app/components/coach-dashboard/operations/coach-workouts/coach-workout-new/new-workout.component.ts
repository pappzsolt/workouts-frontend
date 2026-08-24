import { Component, OnInit } from '@angular/core';
import { CoachWorkoutsService } from '../../../../../services/coach/coach-workouts/coach-workouts.service';
import { Workout } from '../../../../../models/workout.model';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-newworkout',
  templateUrl: './new-workout.component.html',
  styleUrls: ['./new-workout.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule],
})
export class NewWorkoutComponent implements OnInit {

  workouts: Workout[] = [];

  newWorkout = {
    name: '',
    description: '',
    workoutDate: '',
    durationMinutes: 0,
    intensityLevel: '',
    done: false
  };

  message: string = '';
  messageType: 'success' | 'error' | '' = '';

  constructor(
    private coachWorkoutsService: CoachWorkoutsService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {

    const fromProgramBuilder =
      this.route.snapshot.queryParamMap.get(
        'fromProgramBuilder'
      );

    const programId =
      this.route.snapshot.queryParamMap.get(
        'programId'
      );

    console.log(
      'Program Builderből érkezett:',
      fromProgramBuilder
    );

    console.log(
      'Program ID:',
      programId
    );

    this.loadWorkouts();
  }


  loadWorkouts(): void {

    this.coachWorkoutsService
      .getMyWorkouts()
      .subscribe({

        next: (res) => {

          this.workouts =
            res.workouts || [];

        },

        error: (err) => {

          console.error(
            'Hiba a workoutok betöltésekor',
            err
          );

        }

      });
  }


  addWorkout(): void {

    this.coachWorkoutsService
      .addWorkout(this.newWorkout)
      .subscribe({

        next: (res) => {

          this.message =
            'Workout létrehozva!';

          this.messageType =
            'success';


          // Megnézzük, hogy a Program Builderből
          // érkeztünk-e.
          const fromProgramBuilder =
            this.route.snapshot.queryParamMap.get(
              'fromProgramBuilder'
            );


          // Az aktuális program ID-ja.
          const programId =
            this.route.snapshot.queryParamMap.get(
              'programId'
            );


          // ==================================================
          // PROGRAM BUILDERBŐL ÉRKEZTÜNK
          // ==================================================

          if (
            fromProgramBuilder === 'true' &&
            programId
          ) {

            console.log(
              'Új workout létrehozva.',
              'Visszatérés a Program Builderbe.',
              'Program ID:',
              programId
            );

            this.router.navigate(
              ['/coach/program-builder'],
              {
                queryParams: {
                  programId: programId
                }
              }
            );

            return;
          }


          // ==================================================
          // NORMÁL WORKOUT LÉTREHOZÁS
          // ==================================================

          this.resetForm();

          this.loadWorkouts();

        },


        error: (err) => {

          console.error(
            'Hiba a workout létrehozásakor:',
            err
          );

          this.message =
            'Hiba a workout létrehozásakor!';

          this.messageType =
            'error';

        }

      });
  }


  private resetForm(): void {

    this.newWorkout = {

      name: '',
      description: '',
      workoutDate: '',
      durationMinutes: 0,
      intensityLevel: '',
      done: false

    };

  }

}
