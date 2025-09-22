import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CoachTrainingService, Training } from '../../../../services/coach/coach-training.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-coach-training',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './coach-training.component.html',
  styleUrls: ['./coach-training.component.css']
})
export class CoachTrainingComponent implements OnInit {
  trainings$: Observable<Training[]>;

  constructor(private coachTrainingService: CoachTrainingService) {
    this.trainings$ = this.coachTrainingService.getTrainings();
  }

  ngOnInit(): void {
    this.trainings$.subscribe(data => console.log('Fetched trainings:', data));
  }
}

