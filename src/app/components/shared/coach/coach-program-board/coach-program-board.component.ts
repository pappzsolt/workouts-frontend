import { Component, OnInit, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // ✔ hozzáadva
import { CoachProgramService } from '../../../../services/coach/coach-program/coach-program.service';
import { CoachProgram } from '../../../../models/coach-program.model';

@Component({
  selector: 'app-coach-program-board',
  standalone: true,
  imports: [CommonModule, FormsModule], // ✔ FormsModule import
  templateUrl: './coach-program-board.component.html',
  styleUrls: ['./coach-program-board.component.css']
})
export class CoachProgramBoardComponent implements OnInit {
  private programService = inject(CoachProgramService);

  @Input() programs: CoachProgram[] = [];
  selectedProgramId: number | null = null;

  loading = false;
  message = '';

  ngOnInit() {
    if (!this.programs?.length) {
      this.loadPrograms();
    }
  }

  loadPrograms() {
    this.loading = true;
    this.programService.getProgramsForLoggedInCoach().subscribe({
      next: (res) => {
        this.loading = false;
        this.programs = res.data.map(p => ({
          programId: p.id ?? 0,
          programName: p.programName ?? p.name ?? '',
          programDescription: p.programDescription ?? p.description ?? '',
          durationDays: p.durationDays ?? 0,
          difficultyLevel: p.difficultyLevel ?? 'unknown',
          workouts: p.workouts ?? [],
        }));
      },
      error: (err) => {
        this.loading = false;
        this.message = '❌ Programok betöltése sikertelen';
        console.error('❌ Programok betöltése sikertelen', err);
      }
    });
  }
}
