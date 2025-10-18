import { Component, OnInit, inject, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
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

  @Input() externalWorkouts: Workout[] = [];
  @Input() programDropListIds: string[] = [];
  @Input() workouts: Workout[] = [];

  @Output() workoutDropped = new EventEmitter<{ workout: Workout; targetProgramId: number }>();

  connectedDropLists: string[] = [];
  loading = false;
  message = '';

  ngOnInit() {
    this.loadWorkouts();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['programDropListIds'] && this.programDropListIds?.length) {
      this.connectedDropLists = [...this.programDropListIds];
      console.log('🔹 connectedDropLists updated:', this.connectedDropLists);
    }

    if (changes['externalWorkouts'] && this.externalWorkouts?.length) {
      this.workouts = [...this.externalWorkouts];
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
          console.log('✅ Workouts loaded:', this.workouts);
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

      const movedWorkout = event.container.data[event.currentIndex];
      // 🟢 Itt kell meghatározni a cél programId-t
      let targetProgramId: number | undefined;
      if (event.container.id.startsWith('program-')) {
        targetProgramId = parseInt(event.container.id.replace('program-', ''), 10);
      }

      if (targetProgramId) {
        this.workoutDropped.emit({ workout: movedWorkout, targetProgramId });
      }
    }
  }

}
