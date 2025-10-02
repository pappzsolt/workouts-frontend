import { Component, OnInit, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CoachWorkoutsService } from '../../../../services/coach/coach-workouts/coach-workouts.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Workout } from '../../../../models/workout.model';

@Component({
  selector: 'app-coach-workouts',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './coach-workouts.component.html',
  styleUrls: ['./coach-workouts.component.css']  // 🔹 saját CSS hogy tudj üzenetet formázni
})
export class WorkoutListComponent implements OnInit, OnChanges {
  workouts: Workout[] = [];
  newWorkout: Workout = { workoutName: '', description: '', durationMinutes: 0 };

  @Input() programId?: number;   // 🔹 most már opcionális
  @Input() userId: number = 1;   // opcionális userId

  message: string = '';
  messageType: 'success' | 'error' | '' = '';   // 🔹 üzenet típus jelzéshez

  constructor(private coachWorkoutsService: CoachWorkoutsService) {}

  ngOnInit(): void {
    if (this.programId) {
      this.loadWorkouts();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['programId'] && !changes['programId'].firstChange) {
      this.loadWorkouts(); // új programId esetén újratöltjük a workoutokat
    }
  }

  loadWorkouts() {
    if (!this.programId) return;
    this.coachWorkoutsService.getProgramWorkouts(this.programId, this.userId).subscribe({
      next: (data) => {
        this.workouts = data;
        this.setMessage('Workoutok betöltve.', 'success');
      },
      error: () => this.setMessage('Nem sikerült betölteni a workoutokat.', 'error')
    });
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

  deleteWorkout(id?: number) {
    if (!id) return;
    this.coachWorkoutsService.deleteWorkout(id).subscribe({
      next: (res) => {
        this.setMessage(res.message, res.status === 'ok' ? 'success' : 'error');
        this.loadWorkouts();
      },
      error: () => this.setMessage('Hiba történt a törléskor.', 'error')
    });
  }

  private setMessage(msg: string, type: 'success' | 'error') {
    this.message = msg;
    this.messageType = type;

    // 🔹 pár másodperc után automatikusan eltűnik
    setTimeout(() => {
      this.message = '';
      this.messageType = '';
    }, 4000);
  }
}
