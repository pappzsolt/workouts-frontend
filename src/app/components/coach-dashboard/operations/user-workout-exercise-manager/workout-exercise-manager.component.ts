import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { WorkoutExercisesManagerService } from '../../../../services/coach/workout-exercises-manager.service';
import { UserWorkoutExerciseSetService } from '../../../../services/coach/user-workout-exercise-set.service';

import { UserWorkoutExerciseSetModel } from '../../../../models/user-workout-exercise-set.model';

@Component({
  selector: 'app-user-workout-exercise-manager',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './user-workout-exercise-manager.component.html'
})
export class UserWorkoutExerciseManagerComponent implements OnInit {

  selectedUserWorkoutExerciseId?: number;

  selectedSets: UserWorkoutExerciseSetModel[] = [];

  constructor(
    private service: WorkoutExercisesManagerService,
    private setService: UserWorkoutExerciseSetService
  ) {}

  ngOnInit(): void {
  }

  loadSets(userWorkoutExerciseId: number): void {

    this.selectedUserWorkoutExerciseId = userWorkoutExerciseId;
    this.selectedSets = [];

    this.setService
      .getSetsByUserWorkoutExerciseId(userWorkoutExerciseId)
      .subscribe({
        next: sets => {
          this.selectedSets = sets ?? [];
        },
        error: err => {
          console.error('Hiba a set-ek lekérésekor:', err);
          this.selectedSets = [];
        }
      });
  }
}
