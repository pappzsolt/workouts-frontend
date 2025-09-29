import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { UserExerciseService, ExerciseDto } from '../../../../services/user/user-exercise/user-exercise.service';
import { Observable } from 'rxjs';

@Component({
  standalone: true,
  selector: 'app-user-exercises',
  imports: [CommonModule],
  templateUrl: './user-exercises.component.html'
})
export class UserExercisesComponent implements OnInit {
  workoutId!: number;
  workoutName!: string;          // új mező
  exercises$!: Observable<ExerciseDto[]>;

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

    this.exercises$ = this.exercisesService.getExercisesByWorkout(this.workoutId);
  }

  goToExercise(exerciseId: number) {
    // továbbnavigálás exercise detail-re – workoutId + workoutName
    this.router.navigate(['/user/workouts', this.workoutId, 'exercises', exerciseId], {
      state: { workoutName: this.workoutName }
    });
  }
}
