import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { UserExercisesDetailService, Exercise, ExerciseResponse } from '../../../../../services/user/user-exercises-detail/user-exercises-detail.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-user-exercise-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-exercises-detail.component.html',
  styleUrls: ['./user-exercises-detail.component.css']
})
export class UserExerciseDetailComponent implements OnInit {
  exercise$!: Observable<Exercise>;
  exercise!: Exercise; // helyi változó a checkboxhoz
  workoutId!: number; // szükséges a backendnek

  constructor(
    private route: ActivatedRoute,
    private exercisesService: UserExercisesDetailService
  ) {}

  ngOnInit(): void {
    const exerciseId = Number(this.route.snapshot.paramMap.get('exerciseId'));
    this.workoutId = Number(this.route.snapshot.paramMap.get('workoutId'));

    // JSON body-s POST lekérés
    this.exercise$ = this.exercisesService.getExerciseById(exerciseId, this.workoutId);

    // előfizetés a helyi változóhoz (checkbox frissítéséhez)
    this.exercise$.subscribe(ex => this.exercise = ex);
  }

  // Checkbox változtatás kezelése
  onDoneChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.toggleDone(input.checked);
  }

  toggleDone(checked: boolean) {
    if (!this.exercise) return;

    this.exercisesService.updateExerciseDone(this.workoutId, this.exercise.id, checked)
      .subscribe({
        next: (updated: ExerciseResponse) => {
          if (updated.success) {
            this.exercise.done = checked; // frissítés csak sikeres backend válasz esetén
          } else {
            console.error('Hiba a Done frissítésnél:', updated.message);
          }
        },
        error: err => console.error('Hiba a Done frissítésnél', err)
      });
  }
}
