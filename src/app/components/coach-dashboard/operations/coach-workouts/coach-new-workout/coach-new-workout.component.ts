import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CoachWorkoutsService, Training } from '../../../../../services/coach/coach-workouts/coach-workouts.service';

@Component({
  selector: 'app-coach-new-workout',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './coach-new-workout.component.html',
  styleUrls: ['./coach-new-workout.component.css']
})
export class CoachNewWorkoutComponent implements OnInit {
  workout: Partial<Training> = {   // minden mező opcionális
    name: '',
    description: '',
    workout_date: new Date().toISOString().substring(0, 10),
    duration_minutes: 0,
    intensity_level: '',
    created_by_coach_id: 0
  };

  constructor(
    private workoutService: CoachWorkoutsService,
    private router: Router
  ) {}

  ngOnInit(): void {}

  saveWorkout() {
    this.workoutService.createWorkout(this.workout as Training).subscribe(() => {
      this.router.navigate(['/coach/workouts']);
    });
  }
}
