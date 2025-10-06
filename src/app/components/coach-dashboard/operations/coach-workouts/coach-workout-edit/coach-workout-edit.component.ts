import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CoachWorkoutsService } from '../../../../../services/coach/coach-workouts/coach-workouts.service';
import { USER_MESSAGES } from '../../../../../constants/user-messages';
import { Workout } from '../../../../../models/workout.model';

@Component({
  selector: 'app-coach-workout-edit',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './coach-workout-edit.component.html',
  styleUrls: ['./coach-workout-edit.component.css']
})
export class CoachWorkoutEditComponent implements OnInit {
  workoutId?: number;

  workout: Workout = {
    name: '',
    workoutName: '',
    description: '',
    workoutDescription: '',
    durationMinutes: 0,
    difficultyLevel: '',
    programId: undefined,
    // új mezők a backend DTO-ból
    workoutDate: undefined,
    intensityLevel: undefined,
    dayIndex: undefined,
    completed: undefined,
    performedAt: undefined,
    actualSets: undefined,
    actualRepetitions: undefined,
    weightUsed: undefined,
    durationSeconds: undefined,
    feedback: undefined,
    notes: undefined,
    done: undefined
  };

  message: string = '';
  messageType: 'success' | 'error' | '' = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private coachWorkoutsService: CoachWorkoutsService
  ) {}

  ngOnInit(): void {
    this.workoutId = Number(this.route.snapshot.paramMap.get('id'));
    if (this.workoutId) {
      this.loadWorkout();
    }
  }

  loadWorkout(): void {
    this.coachWorkoutsService.getWorkoutById(this.workoutId!).subscribe({
      next: (res) => {
        if (res.status === 'success' && res.data) {
          const w = res.data;

          // Ha a backend ISO stringet ad, vágjuk a dátumot YYYY-MM-DD formátumra
          const workoutDateFormatted = w.workoutDate
            ? w.workoutDate.split('T')[0]   // csak az év-hónap-nap rész
            : undefined;

          this.workout = {
            ...this.workout,
            name: w.workoutName || '',
            workoutName: w.workoutName || '',
            description: w.workoutDescription || '',
            workoutDescription: w.workoutDescription || '',
            durationMinutes: w.durationMinutes || 0,
            difficultyLevel: w.difficultyLevel || '',
            programId: w.programId,
            workoutDate: workoutDateFormatted,
            intensityLevel: w.intensityLevel,
            dayIndex: w.dayIndex,
            completed: w.completed,
            performedAt: w.performedAt,
            actualSets: w.actualSets,
            actualRepetitions: w.actualRepetitions,
            weightUsed: w.weightUsed,
            durationSeconds: w.durationSeconds,
            feedback: w.feedback,
            notes: w.notes,
            done: w.done
          };
        } else {
          this.setMessage(res.message || 'Workout not found.', 'error');
        }
      },
      error: () => this.setMessage('Failed to load workout.', 'error')
    });
  }



  saveWorkout(): void {
    if (!this.workoutId) return;

    // Alakítsd ISO stringgé, de ha nincs, akkor undefined legyen
    const payload: Workout = {
      ...this.workout,
      workoutDate: this.workout.workoutDate
        ? new Date(this.workout.workoutDate).toISOString()
        : undefined
    };

    this.coachWorkoutsService.updateWorkout(this.workoutId, payload).subscribe({
      next: (res) => {
        if (res.status === 'success') {
          this.setMessage('Workout updated successfully!', 'success');
          setTimeout(() => {
            this.router.navigate(['/coach/dashboard']);
          }, 1500);
        } else {
          this.setMessage(res.message || 'Failed to update workout.', 'error');
        }
      },
      error: () => this.setMessage('Failed to save workout.', 'error')
    });
  }




  cancelEdit(): void {
    this.router.navigate(['/coach/dashboard']);
  }

  private setMessage(msg: string, type: 'success' | 'error'): void {
    this.message = msg;
    this.messageType = type;

    setTimeout(() => {
      this.message = '';
      this.messageType = '';
    }, 4000);
  }
}
