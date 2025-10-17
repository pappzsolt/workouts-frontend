import { Component, OnInit, inject, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule, CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { CoachWorkoutsService } from '../../../../services/coach/coach-workouts/coach-workouts.service';
import { Workout } from '../../../../models/workout.model';

@Component({
  selector: 'app-coach-workout-board',
  standalone: true,
  imports: [CommonModule, DragDropModule],
  templateUrl: './coach-workout-board.component.html',
  styleUrls: ['./coach-workout-board.component.css']
})
export class CoachWorkoutBoardComponent implements OnInit, OnChanges {
  private workoutService = inject(CoachWorkoutsService);

  workouts: Workout[] = [];
  loading = false;
  message = '';

  @Input() programDropListIds: string[] = [];

  // 🔹 Dinamikus CDK connectedTo frissítés
  connectedDropLists: string[] = [];

  ngOnInit() {
    this.loadWorkouts();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['programDropListIds'] && this.programDropListIds?.length) {
      this.connectedDropLists = [...this.programDropListIds];
      console.log('🔹 connectedDropLists updated:', this.connectedDropLists);
    }
  }

  loadWorkouts() {
    this.loading = true;
    this.workoutService.getMyWorkouts().subscribe({
      next: (res) => {
        this.loading = false;
        if (res.workouts?.length) {
          this.workouts = res.workouts.sort((a, b) =>
            (a.name ?? '').localeCompare(b.name ?? '')
          );
        } else {
          this.message = 'Nincsenek elérhető workoutok.';
        }
      },
      error: (err) => {
        this.loading = false;
        this.message = 'Hiba a workoutok lekérése során';
        console.error('❌ Workoutok betöltése sikertelen', err);
      }
    });
  }

  drop(event: CdkDragDrop<Workout[]>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
    }
  }
}
