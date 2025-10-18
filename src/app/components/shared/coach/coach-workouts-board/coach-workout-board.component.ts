import { Component, OnInit, Input, Output, EventEmitter, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CoachWorkoutsService } from '../../../../services/coach/coach-workouts/coach-workouts.service';
import { Workout } from '../../../../models/workout.model';

@Component({
  selector: 'app-coach-workout-board',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './coach-workout-board.component.html',
  styleUrls: ['./coach-workout-board.component.css']
})
export class CoachWorkoutBoardComponent implements OnInit, OnChanges {
  private workoutService = inject(CoachWorkoutsService);

  @Input() externalWorkouts: Workout[] = []; // ✔ biztos Input
  @Input() workouts: Workout[] = [];

  @Output() addWorkoutsToProgram = new EventEmitter<number[]>(); // ✔ több kiválasztott workout

  selectedWorkoutIds: number[] = [];

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
      next: (res: any) => {
        this.loading = false;
        if (res.workouts?.length) {
          this.workouts = res.workouts.sort((a: Workout, b: Workout) =>
            (a.name ?? '').localeCompare(b.name ?? '')
          );
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

  toggleWorkoutSelection(id: number, checked: boolean) {
    if (checked) {
      if (!this.selectedWorkoutIds.includes(id)) this.selectedWorkoutIds.push(id);
    } else {
      this.selectedWorkoutIds = this.selectedWorkoutIds.filter(wid => wid !== id);
    }
  }

  onAddSelectedWorkouts() {
    if (this.selectedWorkoutIds.length) {
      this.addWorkoutsToProgram.emit(this.selectedWorkoutIds);
      this.selectedWorkoutIds = [];
    }
  }
}
