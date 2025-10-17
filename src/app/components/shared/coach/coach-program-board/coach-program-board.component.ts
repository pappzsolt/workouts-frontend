import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule, CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { CoachProgramService } from '../../../../services/coach/coach-program/coach-program.service';
import { CoachProgram } from '../../../../models/coach-program.model'; // importáljuk a közös interface-t

@Component({
  selector: 'app-coach-program-board',
  standalone: true,
  imports: [CommonModule, DragDropModule],
  templateUrl: './coach-program-board.component.html',
  styleUrls: ['./coach-program-board.component.css']
})
export class CoachProgramBoardComponent implements OnInit {
  private programService = inject(CoachProgramService);

  @Input() programs: CoachProgram[] = [];
  @Input() programDropListIds: string[] = [];

  loading = false;
  message = '';

  ngOnInit() {
    this.loadPrograms();
  }

  loadPrograms() {
    this.loading = true;
    this.programService.getProgramsForLoggedInCoach().subscribe({
      next: (res) => {
        this.loading = false;

        // 🔹 Adapter: Program[] → CoachProgram[]
        this.programs = res.data.map(p => ({
          programId: p.id ?? 0,
          programName: p.programName ?? p.name ?? '',
          programDescription: p.programDescription ?? p.description ?? '',
          durationDays: p.durationDays ?? 0,
          difficultyLevel: p.difficultyLevel ?? 'unknown',
          workouts: p.workouts ?? [], // kötelező a board komponenshez
        }));

        this.programDropListIds = this.programs.map(p => `program-${p.programId}`);
      },
      error: (err: any) => {
        console.error('❌ Programok betöltése sikertelen', err);
        this.message = 'Hiba a programok lekérése során';
        this.loading = false;
      }
    });
  }

  drop(event: CdkDragDrop<CoachProgram[]>) {
    moveItemInArray(this.programs, event.previousIndex, event.currentIndex);
  }

  dropWorkout(event: CdkDragDrop<any[]>) {
    const prevContainer = event.previousContainer;
    const currContainer = event.container;
    const prevIndex = event.previousIndex;
    const currIndex = event.currentIndex;

    if (prevContainer === currContainer) {
      const program = this.programs.find(p => `program-${p.programId}` === currContainer.id);
      if (program) {
        program.workouts = [...program.workouts];
        moveItemInArray(program.workouts, prevIndex, currIndex);
      }
    } else {
      const prevProgram = this.programs.find(p => `program-${p.programId}` === prevContainer.id);
      const currProgram = this.programs.find(p => `program-${p.programId}` === currContainer.id);

      if (prevProgram && currProgram) {
        const prevWorkouts = [...prevProgram.workouts];
        const currWorkouts = [...currProgram.workouts];

        transferArrayItem(prevWorkouts, currWorkouts, prevIndex, currIndex);

        prevProgram.workouts = prevWorkouts;
        currProgram.workouts = currWorkouts;

        const movedWorkout = currWorkouts[currIndex];
        if (currProgram.programId && movedWorkout?.id) {
          this.saveWorkoutAssignment(currProgram.programId, movedWorkout.id);
        }
      }
    }
  }

  saveWorkoutAssignment(programId: number, workoutId: number) {
    if (!programId || !workoutId) return;

    if (!this.programService.assignWorkoutToProgram) {
      console.error('❌ assignWorkoutToProgram metódus nem található a service-ben');
      return;
    }

    this.programService.assignWorkoutToProgram(programId, workoutId).subscribe({
      next: (res: any) => {
        console.log('✅ Workout sikeresen hozzárendelve', res);
      },
      error: (err: any) => {
        console.error('❌ Workout hozzárendelés sikertelen', err);
      },
    });
  }
}
