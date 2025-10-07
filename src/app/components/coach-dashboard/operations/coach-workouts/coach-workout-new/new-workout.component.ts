import { Component, OnInit } from '@angular/core';
import { CoachWorkoutsService } from '../../../../../services/coach/coach-workouts/coach-workouts.service';
import { Workout } from '../../../../../models/workout.model';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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
    workoutDate: '',       // string formátumú, pl. yyyy-mm-dd
    durationMinutes: 0,
    intensityLevel: '',
    done: false
  };

  message: string = '';
  messageType: 'success' | 'error' | '' = '';

  constructor(private coachWorkoutsService: CoachWorkoutsService) {}

  ngOnInit(): void {
    this.loadWorkouts();
  }

  loadWorkouts(): void {
    this.coachWorkoutsService.getMyWorkouts().subscribe({
      next: (res) => {
        this.workouts = res.workouts || [];
      },
      error: (err) => console.error('Hiba a workoutok betöltésekor', err),
    });
  }

  addWorkout(): void {
    this.coachWorkoutsService.addWorkout(this.newWorkout).subscribe({
      next: (res) => {
        this.message = 'Workout létrehozva!';
        this.messageType = 'success';
        this.resetForm();
        this.loadWorkouts();
      },
      error: (err) => {
        console.error(err);
        this.message = 'Hiba a workout létrehozásakor!';
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
      done: false
    };
  }
}
