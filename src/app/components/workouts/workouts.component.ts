import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { WorkoutsService, Workout } from '../../services/workouts/workouts.service';
import { Observable } from 'rxjs';

@Component({
  standalone: true,
  selector: 'app-workouts',
  imports: [CommonModule],
  templateUrl: './workouts.component.html',
})
export class WorkoutsComponent implements OnInit {
  programId!: number;
  workouts$!: Observable<Workout[]>;

  constructor(
    private route: ActivatedRoute,
    private router: Router,  // ⬅ hozzáadva
    private workoutsService: WorkoutsService
  ) {}

  ngOnInit(): void {
    this.programId = Number(this.route.snapshot.paramMap.get('id'));
    this.workouts$ = this.workoutsService.getWorkoutsByProgram(this.programId);
  }

  // ⬅ hozzáadott navigációs metódus
  goToExercises(workoutId: number) {
    this.router.navigate(['/user/workouts', workoutId, 'exercises']);
  }
}
