import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ExerciseService} from '../../../../../services/coach/coach-exercises/coach-exercises.service';
import { Exercise ,WorkoutDto, WorkoutExercise} from '../../../../../models/exercise.model';

@Component({
  selector: 'app-coach-exercise-edit',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './coach-exercise-edit.component.html',
  styleUrls: ['./coach-exercise-edit.component.css']
})
export class CoachExerciseEditComponent implements OnInit {

  exercise: Exercise = {
    id: 0, // kötelező szám, default 0
    name: '',
    description: '',
    imageUrl: '',
    videoUrl: '',
    muscleGroup: '',
    equipment: '',
    difficultyLevel: '',
    category: '',
    caloriesBurnedPerMinute: 0,
    durationSeconds: 0
  };

  loading: boolean = false;
  saving: boolean = false;
  errorMessage: string = '';

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private exerciseService: ExerciseService
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      this.loadExercise(id);
    }
  }

  loadExercise(exerciseId: number): void {
    this.loading = true;

    this.exerciseService.getWorkoutsWithExercises().subscribe({
      next: (workouts: WorkoutDto[]) => {
        // Keresés az összes workout-ban
        const we = workouts
          .flatMap(w => w.exercises)           // összes WorkoutExercise egy tömbbe
          .find((we: WorkoutExercise) => we.exercise.id === exerciseId);

        if (we && we.exercise) {
          this.exercise = { ...we.exercise };
        } else {
          this.errorMessage = 'A kiválasztott exercise nem található';
        }

        this.loading = false;
      },
      error: (err) => {
        console.error('Hiba az exercise betöltésénél:', err);
        this.errorMessage = 'Hiba az exercise betöltésénél';
        this.loading = false;
      }
    });
  }



  saveExercise(): void {
    this.saving = true;
    this.exerciseService.updateExercise(this.exercise).subscribe({
      next: (updated) => {
        console.log('Exercise frissítve:', updated);
        this.saving = false;
        this.router.navigate(['/coach/exercises']);
      },
      error: (err) => {
        console.error('Hiba az exercise frissítésénél:', err);
        this.errorMessage = 'Hiba az exercise mentésénél';
        this.saving = false;
      }
    });
  }
}
