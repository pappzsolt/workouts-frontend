import { Component, OnInit, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CoachWorkoutsService } from '../../../../services/coach/coach-workouts/coach-workouts.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { Workout } from '../../../../models/workout.model';

import { USER_MESSAGES } from '../../../../constants/user-messages';
import { Router } from '@angular/router';
import { NewWorkoutComponent } from '../../operations/coach-workouts/coach-workout-new/new-workout.component';

@Component({
  selector: 'app-coach-workouts',
  standalone: true,
  imports: [CommonModule, FormsModule, NewWorkoutComponent],
  templateUrl: './coach-workouts.component.html',
  styleUrls: ['./coach-workouts.component.css']
})
export class WorkoutListComponent implements OnInit, OnChanges {
  workouts: Workout[] = [];
  newWorkout: Workout = { workoutName: '', description: '', durationMinutes: 0 };

  @Input() programId?: number;
  @Input() userId: number = 1;

  message: string = '';
  messageType: 'success' | 'error' | '' = '';

  showNewWorkoutForm: boolean = false;

  // 🔹 Lapozáshoz
  currentPage = 1;
  itemsPerPage = 4;
  totalPages = 1;

  constructor(private coachWorkoutsService: CoachWorkoutsService, private router: Router) {}

  ngOnInit(): void {
    this.loadWorkouts();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['programId'] && !changes['programId'].firstChange) {
      this.loadWorkouts();
    }
  }

  loadWorkouts(): void {
    console.log('[CoachWorkouts] loadWorkouts()');

    this.coachWorkoutsService.getMyWorkouts().subscribe({
      next: (res: Workout[]) => {

        console.log('[CoachWorkouts] response:', res);

        this.workouts = res.map((w: Workout) => ({
          id: w.id,
          workoutName: w.workoutName ?? w.name,
          description: w.description ?? w.workoutDescription,
          durationMinutes: w.durationMinutes,
          difficultyLevel: w.difficultyLevel,
          exercises: w.exercises ?? []
        }));

        this.currentPage = 1;

        this.totalPages = Math.max(
          1,
          Math.ceil(this.workouts.length / this.itemsPerPage)
        );

        console.log(
          '[CoachWorkouts] betöltött workoutok:',
          this.workouts
        );
      },

      error: (error) => {
        console.error(
          '[CoachWorkouts] workout betöltési hiba:',
          error
        );

        this.workouts = [];
        this.currentPage = 1;
        this.totalPages = 1;

        this.setMessage(
          'Nem sikerült betölteni a workoutokat.',
          'error'
        );
      }
    });
  }

  // 🔹 Getter a lapozott workoutokhoz
  get pagedWorkouts(): Workout[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.workouts.slice(startIndex, startIndex + this.itemsPerPage);
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) this.currentPage++;
  }

  prevPage(): void {
    if (this.currentPage > 1) this.currentPage--;
  }

  addWorkout() {
    if (!this.programId) return;
    this.newWorkout.programId = this.programId;
    this.coachWorkoutsService.addWorkout(this.newWorkout).subscribe({
      next: (res) => {
        if (res.status === 'ok') {
          this.setMessage(res.message, 'success');
          this.loadWorkouts();
          this.newWorkout = { workoutName: '', description: '', durationMinutes: 0 };
        } else {
          this.setMessage(res.message, 'error');
        }
      },
      error: () => this.setMessage('Hiba történt a workout hozzáadásakor.', 'error')
    });
  }

  editWorkout(workoutId: number | undefined, event: MouseEvent) {
    event.stopPropagation();
    if (!workoutId) {
      this.message = USER_MESSAGES.workoutClickError;
      return;
    }

    this.router.navigate([`/coach/workouts/${workoutId}/edit`])
      .catch(err => {
        console.error('router.navigate hiba:', err);
        this.message = USER_MESSAGES.workoutClickError;
      });
  }

  toggleNewWorkout() {
    this.showNewWorkoutForm = !this.showNewWorkoutForm;
  }

  private setMessage(msg: string, type: 'success' | 'error') {
    this.message = msg;
    this.messageType = type;
    setTimeout(() => {
      this.message = '';
      this.messageType = '';
    }, 4000);
  }

  goToNewWorkout(): void {
    this.router.navigate(['/coach/workouts/new']);
  }
}
