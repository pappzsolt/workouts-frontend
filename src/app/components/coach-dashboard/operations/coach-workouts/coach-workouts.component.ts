import { Component, OnInit, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CoachWorkoutsService } from '../../../../services/coach/coach-workouts/coach-workouts.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Workout } from '../../../../models/workout.model';
import { USER_MESSAGES } from '../../../../constants/user-messages';
import { Router } from '@angular/router';
import { NewWorkoutComponent } from '../../operations/coach-workouts/coach-workout-new/new-workout.component'; // 🔹 importáljuk a NewWorkoutComponent-et

@Component({
  selector: 'app-coach-workouts',
  standalone: true,
  imports: [CommonModule, FormsModule, NewWorkoutComponent], // 🔹 hozzáadjuk az imports-hoz
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

  // 🔹 új változó a NewWorkoutComponent megjelenítéséhez
  showNewWorkoutForm: boolean = false;

  constructor(private coachWorkoutsService: CoachWorkoutsService, private router: Router,) {}

  ngOnInit(): void {
    this.loadWorkouts();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['programId'] && !changes['programId'].firstChange) {
      this.loadWorkouts(); // új programId esetén újratöltjük a workoutokat
    }
  }

  loadWorkouts() {
    this.coachWorkoutsService.getMyWorkouts().subscribe({
      next: (res) => {
        if (res.status === 'success' && res.workouts) {
          this.workouts = res.workouts.map(w => ({
            id: w.id,
            workoutName: w.name,          // backend "name" -> frontend "workoutName"
            description: w.description,
            durationMinutes: w.durationMinutes,
            // programId opcionális, mert a backend nem adja
          }));
          this.setMessage('Workoutok betöltve.', 'success');
        } else {
          this.setMessage(res.message || 'Nincsenek workoutok.', 'error');
        }
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

  // 🔹 metódus a lebegő gombhoz
  toggleNewWorkout() {
    this.showNewWorkoutForm = !this.showNewWorkoutForm;
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
  goToNewWorkout(): void {
    this.router.navigate(['/coach/workouts/new']);
  }

}
