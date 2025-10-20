import { Component, OnInit, OnChanges, SimpleChanges, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ExerciseService } from '../../../../services/coach/coach-exercises/coach-exercises.service';
import { Exercise } from '../../../../models/exercise.model';

@Component({
  selector: 'app-coach-exercises-board',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './coach-exercises-board.component.html'
})
export class CoachExercisesBoardComponent implements OnInit, OnChanges {
  private exerciseService = inject(ExerciseService);

  @Input() externalExercises: Exercise[] = [];
  @Input() externalSelectedExercises: Exercise[] = []; // ✅ új bemenet a szülő selectedExercises tükrözéséhez
  @Output() exercisesChange = new EventEmitter<Exercise[]>();  // teljes Exercise tömb

  exercises: Exercise[] = [];
  selectedExercises: Exercise[] = []; // kiválasztott exercise-ek
  loading = false;
  message = '';

  // ---------------- Lapozás ----------------
  exercisePage: number = 1;
  pageSize: number = 5;

  ngOnInit() {
    this.loadExercises();
  }

  ngOnChanges(changes: SimpleChanges) {
    // ✅ ha a szülő selectedExercises tömbje változik (pl. reset esetén)
    if (changes['externalSelectedExercises']) {
      if (this.externalSelectedExercises?.length) {
        this.selectedExercises = [...this.externalSelectedExercises];
      } else {
        this.selectedExercises = []; // reset
      }
    }

    if (changes['externalExercises'] && this.externalExercises?.length) {
      this.exercises = [...this.externalExercises];
      this.exercisePage = 1; // reset lapozás
      this.exercisesChange.emit([...this.selectedExercises]); // küldjük a kiválasztottakat
    }
  }

  loadExercises() {
    this.loading = true;
    this.exerciseService.getAllExercises().subscribe({
      next: (res: Exercise[]) => {
        this.loading = false;
        this.exercises = res;
        this.exercisePage = 1; // reset lapozás
        if (!this.exercises.length) this.message = 'Nincsenek elérhető exercise-ek.';
      },
      error: (err) => {
        this.loading = false;
        this.message = 'Hiba az exercise-ek betöltése során';
        console.error('❌ Exercise-ek betöltése sikertelen', err);
      }
    });
  }

  // ---------------- Lapozás logika ----------------
  get pagedExercises(): Exercise[] {
    const start = (this.exercisePage - 1) * this.pageSize;
    return this.exercises.slice(start, start + this.pageSize);
  }

  get totalExercisePages(): number {
    return Math.ceil(this.exercises.length / this.pageSize);
  }

  nextExercisePage() {
    if (this.exercisePage < this.totalExercisePages) this.exercisePage++;
  }

  prevExercisePage() {
    if (this.exercisePage > 1) this.exercisePage--;
  }

  // ---------------- Kiválasztás logika ----------------
  isExerciseSelected(ex: Exercise): boolean {
    return !!this.selectedExercises.find(e => e.id === ex.id);
  }

  toggleExerciseSelection(ex: Exercise, checked: boolean) {
    if (checked) {
      if (!this.selectedExercises.find(e => e.id === ex.id)) {
        this.selectedExercises.push(ex); // hozzáadás
      }
    } else {
      this.selectedExercises = this.selectedExercises.filter(e => e.id !== ex.id); // eltávolítás
    }
    this.exercisesChange.emit([...this.selectedExercises]); // emitálás
  }

  onCheckboxChange(ex: Exercise, event: Event) {
    const target = event.target as HTMLInputElement;
    this.toggleExerciseSelection(ex, target.checked);
  }
}
