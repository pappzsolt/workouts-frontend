import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { UserExerciseService, WorkoutDto, WorkoutExerciseDto } from '../../../../services/user/user-exercise/user-exercise.service';
import { Observable, map } from 'rxjs';

@Component({
  standalone: true,
  selector: 'app-user-exercises',
  imports: [CommonModule],
  templateUrl: './user-exercises.component.html'
})
export class UserExercisesComponent implements OnInit {
  workoutId!: number;
  workoutName!: string;
  exercises$!: Observable<WorkoutExerciseDto[]>;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private exercisesService: UserExerciseService
  ) {}

  ngOnInit(): void {
    // route paramok
    this.workoutId = Number(this.route.snapshot.paramMap.get('workoutId'));

    // state-ből jön a workoutName
    this.workoutName = history.state['workoutName'];

    // Lekérés a backend-től: most WorkoutDto-t kapunk, kivesszük az exercises listát
    this.exercises$ = this.exercisesService.getWorkoutExercises(this.workoutId).pipe(
      map((workout: WorkoutDto) => workout.exercises)
    );
  }

  goToExercise(exerciseId: number) {
    // továbbnavigálás exercise detail-re – workoutId + workoutName
    this.router.navigate(['/user/workouts', this.workoutId, 'exercises', exerciseId], {
      state: { workoutName: this.workoutName }
    });
  }
}

