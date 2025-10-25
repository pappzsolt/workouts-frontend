import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Workout } from '../../../models/workout.model';
import { CoachWorkoutsService } from '../../../services/coach/coach-workouts/coach-workouts.service';

@Component({
  selector: 'app-workout-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <label for="workoutSelect" class="block mb-1">Válassz edzést</label>
    <select id="workoutSelect" [(ngModel)]="selectedWorkoutId" (ngModelChange)="onChange($event)"
            class="border rounded px-2 py-1 w-full">
      <option [ngValue]="undefined">-- Válassz edzést --</option>
      <option *ngFor="let w of workouts" [ngValue]="w.id">{{ w.name }}</option>
    </select>
  `
})
export class WorkoutSelectComponent implements OnInit {
  workouts: Workout[] = [];

  @Input() selectedWorkoutId?: number;
  @Output() selectedWorkoutIdChange = new EventEmitter<number>();
  @Output() workoutSelected = new EventEmitter<Workout>();

  constructor(private workoutService: CoachWorkoutsService) {}

  ngOnInit(): void {
    this.workoutService.getMyWorkoutsForSelect().subscribe({
      next: res => this.workouts = res.workouts, // 🔹 itt a tömb kerül hozzárendelésre
      error: err => console.error('Hiba az edzések lekérésekor:', err)
    });
  }


  onChange(id?: number): void {
    this.selectedWorkoutIdChange.emit(id);
    const workout = this.workouts.find(w => w.id === id);
    if (workout) {
      this.workoutSelected.emit(workout);
    }
  }
}
