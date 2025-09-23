import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CoachWorkoutsService, Training } from '../../../../services/coach/coach-workouts/coach-workouts.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-coach-training',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './coach-workouts.component.html',
  styleUrls: ['./coach-workouts.component.css']
})
export class CoachWorkoutsComponent implements OnInit {
  trainings$: Observable<Training[]>;

  constructor(private coachTrainingService: CoachWorkoutsService) {
    this.trainings$ = this.coachTrainingService.getTrainings();
  }

  ngOnInit(): void {
    this.trainings$.subscribe(data => console.log('Fetched trainings:', data));
  }
}

