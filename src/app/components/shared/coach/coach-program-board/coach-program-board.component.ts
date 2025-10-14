import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule, CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { CoachProgramService } from '../../../../services/coach/assign-program/coach-program.service';
import { Workout } from '../../../../models/workout.model';

export interface CoachProgram {
  programId: number;
  programName?: string;
  programDescription?: string;
  durationDays?: number;
  difficultyLevel?: string;
  workouts: Workout[]; // 🔹 mindig inicializált tömb
}

@Component({
  selector: 'app-coach-program-board',
  standalone: true,
  imports: [CommonModule, DragDropModule],
  templateUrl: './coach-program-board.component.html'
})
export class CoachProgramBoardComponent implements OnInit {
  private programService = inject(CoachProgramService);

  programs: CoachProgram[] = [];
  programDropListIds: string[] = [];

  loading = false;
  message = '';

  ngOnInit() {
    this.loadPrograms();
  }

  loadPrograms() {
    this.loading = true;

    this.programService.getMyPrograms().subscribe(
      programsFromService => {
        this.loading = false;

        if (!programsFromService?.length) {
          this.message = 'Nincsenek elérhető programok.';
          return;
        }

        // 🔹 Inicializáljuk a workouts tömböt minden programhoz
        this.programs = programsFromService.map(p => ({
          ...p,
          workouts: [] // mindig inicializált
        }));

        // DropList ID-k generálása minden programhoz
        this.programDropListIds = this.programs.map(p => `program-${p.programId}`);
      },
      err => {
        console.error('❌ Programok betöltése sikertelen', err);
        this.message = 'Hiba a programok lekérése során';
        this.loading = false;
      }
    );
  }

  /** Drag & Drop a programok sorrendjéhez */
  drop(event: CdkDragDrop<CoachProgram[]>) {
    moveItemInArray(this.programs, event.previousIndex, event.currentIndex);
  }

  /** Drag & Drop a workoutokhoz a program oszlopokban */
  dropWorkout(event: CdkDragDrop<Workout[]>) {
    const prevData = event.previousContainer.data ?? [];
    const currData = event.container.data ?? [];

    if (event.previousContainer === event.container) {
      moveItemInArray(currData, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(prevData, currData, event.previousIndex, event.currentIndex);
    }

    // 🔹 Frissítjük a container.data-t, hogy mindig definiált legyen
    event.container.data = currData;
    event.previousContainer.data = prevData;
  }
}
