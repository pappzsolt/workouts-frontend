import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { UserWorkoutsService, Workout } from '../../../../services/user/user-workouts/user-workouts.service';
import { Observable } from 'rxjs';

@Component({
  standalone: true,
  selector: 'app-workouts',
  imports: [CommonModule],
  templateUrl: './workouts.component.html',
})
export class WorkoutsComponent implements OnInit {
  programId!: number;
  programName!: string; // 🔹 itt tároljuk a program nevét
  workouts$!: Observable<Workout[]>;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private workoutsService: UserWorkoutsService
  ) {}

  ngOnInit(): void {
    this.programId = Number(this.route.snapshot.paramMap.get('id'));

    // 🔹 state-ből lekérjük a program nevét
    const navState = window.history.state;
    this.programName = navState.programName || 'Unknown Program';

    this.workouts$ = this.workoutsService.getWorkoutsByProgram(this.programId);
  }

  /** Navigáció a workout exercises oldalára + state-alapú névátadás */
  goToExercises(workoutId: number, workoutName: string): void {
    this.router.navigate(
      ['/user/workouts', workoutId, 'exercises'],
      { state: { workoutName } } // 🔹 átadjuk a workout nevét
    );
  }
}
