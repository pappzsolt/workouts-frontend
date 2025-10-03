import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ExerciseService,
  Exercise,
  WorkoutDto,
  WorkoutExercise
} from '../../../../services/coach/coach-exercises/coach-exercises.service';

@Component({
  selector: 'app-exercise-controller',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './coach-exercises.component.html',
  styleUrls: ['./coach-exercises.component.css']
})
export class ExerciseControllerComponent implements OnInit {

  exercises: WorkoutExercise[] = []; // csak a workout-exercises
  loading = false;

  constructor(private exerciseService: ExerciseService) {}

  ngOnInit(): void {
    this.loadExercises();
  }

  // 🔹 Összes exercise betöltése (minden workoutból kilapítva)
  loadExercises(): void {
    this.loading = true;
    this.exerciseService.getWorkoutsWithExercises().subscribe({
      next: (workouts: WorkoutDto[]) => {
        this.exercises = workouts.flatMap(w => w.exercises || []);
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Hiba az exercise-ok betöltésénél:', err);
        this.loading = false;
      }
    });
  }

  // 🔹 Egy workout exercise lekérdezése (ha pl. részletes nézet kell)
  loadWorkoutExercises(workoutId: number): void {
    this.exerciseService.getWorkoutExercises(workoutId).subscribe({
      next: (workout: WorkoutDto) => {
        this.exercises = workout.exercises || [];
      },
      error: (err) => console.error('Hiba a workout exercise-ok betöltésénél:', err)
    });
  }

  // 🔹 Exercise hozzáadása
  addExercise(newExercise: Exercise): void {
    this.exerciseService.addExercise(newExercise).subscribe({
      next: (created: Exercise) => {
        console.log('Exercise hozzáadva:', created);
        this.loadExercises(); // újratöltés
      },
      error: (err) => console.error('Hiba az exercise hozzáadásánál:', err)
    });
  }

  // 🔹 Exercise módosítása
  updateExercise(exercise: Exercise): void {
    this.exerciseService.updateExercise(exercise).subscribe({
      next: (updated: Exercise) => {
        console.log('Exercise frissítve:', updated);
        this.loadExercises();
      },
      error: (err) => console.error('Hiba az exercise frissítésénél:', err)
    });
  }

  // 🔹 Exercise törlése
  deleteExercise(exerciseId: number): void {
    this.exerciseService.deleteExercise(exerciseId).subscribe({
      next: (res: string) => {
        console.log('Exercise törölve:', res);
        this.loadExercises();
      },
      error: (err) => console.error('Hiba az exercise törlésénél:', err)
    });
  }

  // 🔹 Done státusz módosítása (true/false)
  toggleDone(workoutId: number, exerciseId: number, done: boolean): void {
    this.exerciseService.updateWorkoutExerciseDone(workoutId, exerciseId, done).subscribe({
      next: (res: string) => {
        console.log('Exercise státusz frissítve:', res);
        const ex = this.exercises.find(e => e.id === exerciseId);
        if (ex) ex.done = done;
      },
      error: (err) => console.error('Hiba a done módosításnál:', err)
    });
  }
}
