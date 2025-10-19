import { Component, OnInit, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CoachProgramService } from '../../../../services/coach/coach-program/coach-program.service';
import { CoachProgram } from '../../../../models/coach-program.model';
import { ProgramDto } from '../../../../models/program.model';

@Component({
  selector: 'app-coach-program-board',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './coach-program-board.component.html',
  styleUrls: ['./coach-program-board.component.css']
})
export class CoachProgramBoardComponent implements OnInit {
  private programService = inject(CoachProgramService);

  @Input() programs: CoachProgram[] = [];
  @Output() programSelected = new EventEmitter<number>();

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
        this.programs = (res.data as ProgramDto[]).map(p => ({
          programId: p.programId,
          programName: p.programName,
          programDescription: p.programDescription,
          durationDays: p.durationDays,
          difficultyLevel: p.difficultyLevel,
          workouts: p.workouts ?? [],
        }));
        console.log('Mapped programs:', this.programs);
      },
      error: (err) => {
        this.loading = false;
        this.message = '❌ Programok betöltése sikertelen';
        console.error('❌ Programok betöltése sikertelen', err);
      }
    });
  }

  onSelectProgram(id: number) {
    this.selectedProgramId = id;
    this.programSelected.emit(id);
  }
}
