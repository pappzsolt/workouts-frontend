import { Component, OnInit, inject, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CoachWorkoutsService } from '../../../../services/coach/coach-workouts/coach-workouts.service';
import { Workout } from '../../../../models/workout.model';

@Component({
  selector: 'app-coach-workout-board',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './coach-workout-board.component.html',
  styleUrls: ['./coach-workout-board.component.css']
})
export class CoachWorkoutBoardComponent implements OnInit, OnChanges {
  private workoutService = inject(CoachWorkoutsService);

  @Input() externalWorkouts: Workout[] = [];
  @Input() workouts: Workout[] = [];

  loading = false;
  message = '';

  ngOnInit() {
    this.loadWorkouts();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['externalWorkouts'] && this.externalWorkouts?.length) {
      this.workouts = [...this.externalWorkouts];
    }
  }

  loadWorkouts() {
    this.loading = true;
    this.workoutService.getMyWorkouts().subscribe({
      next: (res) => {
        this.loading = false;
        if (res.workouts?.length) {
          this.workouts = res.workouts.sort((a, b) =>
            (a.name ?? '').localeCompare(b.name ?? '')
          );
          console.log('✅ Workouts loaded:', this.workouts);
        } else {
          this.message = 'Nincsenek elérhető workoutok.';
        }
      },
      error: (err) => {
        this.loading = false;
        this.message = 'Hiba a workoutok lekérése során';
        console.error('❌ Workoutok betöltése sikertelen', err);
      }
    });
  }
}
