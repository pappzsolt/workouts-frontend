import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ExerciseDetailService, ExerciseDetail } from '../../../services/exercises/exercise-detail.service';

@Component({
  standalone: true,
  selector: 'app-exercise-detail',
  imports: [CommonModule, FormsModule],
  templateUrl: './exercise-detail.component.html'
})
export class ExerciseDetailComponent implements OnInit {
  exerciseId!: number;
  exercise!: ExerciseDetail;

  constructor(
    private route: ActivatedRoute,
    private exerciseDetailService: ExerciseDetailService
  ) {}

  ngOnInit(): void {
    this.exerciseId = Number(this.route.snapshot.paramMap.get('exerciseId'));
    this.exerciseDetailService.getExerciseById(this.exerciseId).subscribe(data => {
      this.exercise = data;
    });
  }

  save() {
    this.exerciseDetailService.updateExercise(this.exerciseId, this.exercise).subscribe(updated => {
      this.exercise = updated;
      alert('Sikeresen mentve!');
    });
  }
}
