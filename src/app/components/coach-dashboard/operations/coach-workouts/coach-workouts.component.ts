import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CoachWorkoutsService, Training } from '../../../../services/coach/coach-workouts/coach-workouts.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-coach-workouts',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './coach-workouts.component.html',
})
export class CoachWorkoutsComponent implements OnInit {
  programId!: number;
  trainings: Training[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private workoutService: CoachWorkoutsService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = Number(params.get('id'));
      if (id) {
        this.programId = id;
        this.loadWorkouts(id);
      } else {
        // Ha nincs programId, akkor mindent mutat
        this.workoutService.getTrainings().subscribe(data => this.trainings = data);
      }
    });
  } // <-- itt lezárva a ngOnInit()

  loadWorkouts(programId: number) {
    this.workoutService.getWorkoutsByProgram(programId).subscribe(data => {
      this.trainings = data;
    });
  }

  goToWorkoutDetails(workoutId: number) {
    this.router.navigate([`/coach/workouts/${workoutId}`]);
  }

  editWorkout(workoutId: number) {
    this.router.navigate([`/coach/workouts/${workoutId}/edit`]);
  }
  createNewWorkout() {
    this.router.navigate(['/coach/workouts/new']); // vagy a megfelelő útvonal
  }
}
