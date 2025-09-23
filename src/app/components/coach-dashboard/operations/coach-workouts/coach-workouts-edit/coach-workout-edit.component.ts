// src/app/components/coach-dashboard/operations/coach-workouts/coach-workout-edit.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CoachWorkoutsService, Training } from '../../../../../services/coach/coach-workouts/coach-workouts.service';

@Component({
  selector: 'app-coach-workout-edit',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './coach-workout-edit.component.html',
  styleUrls: ['./coach-workout-edit.component.css']
})
export class CoachWorkoutEditComponent implements OnInit {
  workout: Training = {
    id: 0,
    name: '',
    description: '',
    workout_date: new Date().toISOString().substring(0, 10),
    duration_minutes: 0,
    intensity_level: '',
    created_by_coach_id: 0
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private workoutService: CoachWorkoutsService
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      this.workoutService.getWorkoutById(id).subscribe((data: Training | undefined) => {
        if (data) {
          this.workout = data;
        }
      });
    }
  }

  saveWorkout() {
    if (this.workout.id) {
      this.workoutService.updateWorkout(this.workout.id, this.workout).subscribe(() => {
        alert('Workout updated!');
        this.router.navigate(['/coach/workouts']);
      });
    } else {
      this.workoutService.createWorkout(this.workout).subscribe(() => {
        alert('Workout created!');
        this.router.navigate(['/coach/workouts']);
      });
    }
  }
}
