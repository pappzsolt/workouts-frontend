import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CoachProgramService } from '../../../../services/coach/coach-program/coach-program.service';
import { CoachProgram } from '../../../../models/coach-program.model';

@Component({
  selector: 'app-coach-program-board',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './coach-program-board.component.html',
  styleUrls: ['./coach-program-board.component.css']
})
export class CoachProgramBoardComponent implements OnInit {
  private programService = inject(CoachProgramService);

  @Input() programs: CoachProgram[] = [];

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

        // Adapter: Program[] → CoachProgram[]
        this.programs = res.data.map(p => ({
          programId: p.id ?? 0,
          programName: p.programName ?? p.name ?? '',
          programDescription: p.programDescription ?? p.description ?? '',
          durationDays: p.durationDays ?? 0,
          difficultyLevel: p.difficultyLevel ?? 'unknown',
          workouts: p.workouts ?? [],
        }));
      },
      error: (err: any) => {
        console.error('❌ Programok betöltése sikertelen', err);
        this.message = 'Hiba a programok lekérése során';
        this.loading = false;
      }
    });
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
