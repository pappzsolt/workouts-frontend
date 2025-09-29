import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CoachWorkoutsService, Training } from '../../../../services/coach/coach-workouts/coach-workouts.service';
import { CommonModule } from '@angular/common';
import { USER_MESSAGES } from '../../../../constants/user-messages';

@Component({
  selector: 'app-coach-workouts',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './coach-workouts.component.html',
})
export class CoachWorkoutsComponent implements OnInit {
  programId!: number;
  trainings: Training[] = [];
  message: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private workoutService: CoachWorkoutsService
  ) {}

  ngOnInit(): void {
    try {
      this.route.paramMap.subscribe(params => {
        const id = Number(params.get('id'));
        if (id) {
          this.programId = id;
          this.loadWorkouts(id);
        } else {
          this.loadAllTrainings();
        }
      });
    } catch (error) {
      this.message = USER_MESSAGES.loadProgramsError;
    }
  }

  private async loadAllTrainings() {
    try {
      const data = await this.workoutService.getTrainings().toPromise();
      if (!data || data.length === 0) {
        this.message = USER_MESSAGES.noPrograms;
      }
      this.trainings = data || [];
    } catch (error) {
      this.message = USER_MESSAGES.loadProgramsError;
      this.trainings = [];
    }
  }

  private async loadWorkouts(programId: number) {
    try {
      const data = await this.workoutService.getWorkoutsByProgram(programId).toPromise();
      if (!data || data.length === 0) {
        this.message = USER_MESSAGES.noPrograms;
      }
      this.trainings = data || [];
    } catch (error) {
      this.message = USER_MESSAGES.loadProgramsError;
      this.trainings = [];
    }
  }

  async goToWorkoutDetails(workoutId: number) {
    try {
      await this.router.navigate([`/coach/workouts/${workoutId}`]);
    } catch {
      this.message = USER_MESSAGES.programClickError;
    }
  }

  async editWorkout(workoutId: number) {
    try {
      await this.router.navigate([`/coach/workouts/${workoutId}/edit`]);
    } catch {
      this.message = USER_MESSAGES.programClickError;
    }
  }

  async createNewWorkout() {
    try {
      await this.router.navigate(['/coach/workouts/new']);
    } catch {
      this.message = USER_MESSAGES.programClickError;
    }
  }
}
