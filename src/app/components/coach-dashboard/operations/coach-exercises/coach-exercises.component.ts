import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';

import { Exercise } from '../../../../models/exercise.model';
import { ExerciseService } from '../../../../services/coach/coach-exercises/coach-exercises.service';

@Component({
  selector: 'app-exercise-controller',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './coach-exercises.component.html',
  styleUrls: ['./coach-exercises.component.css']
})
export class ExerciseControllerComponent implements OnInit {

  exercises: Exercise[] = [];

  loading = false;

  currentPage = 1;
  itemsPerPage = 4;
  totalPages = 1;

  constructor(
    private exerciseService: ExerciseService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.loadExercises();
  }

  loadExercises(): void {
    this.loading = true;

    this.exerciseService.getAllExercises().subscribe({
      next: (exercises: Exercise[]) => {
        this.exercises = exercises;

        this.currentPage = 1;

        this.totalPages = Math.max(
          1,
          Math.ceil(this.exercises.length / this.itemsPerPage)
        );

        this.loading = false;
      },

      error: () => {
        this.loading = false;
      }
    });
  }

  get pagedExercises(): Exercise[] {
    const startIndex =
      (this.currentPage - 1) * this.itemsPerPage;

    return this.exercises.slice(
      startIndex,
      startIndex + this.itemsPerPage
    );
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  editExercise(exerciseId: number): void {
    this.router.navigate([
      '/coach/exercises',
      exerciseId,
      'edit'
    ]);
  }

  goToNewExercise(): void {
    this.router.navigate([
      '/coach/exercises/new'
    ]);
  }
}
