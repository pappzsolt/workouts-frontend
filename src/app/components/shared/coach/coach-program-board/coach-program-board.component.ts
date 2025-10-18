import { Component, OnInit, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // ⚡ szükséges a ngModel-hez
import { CoachProgramService } from '../../../../services/coach/coach-program/coach-program.service';
import { CoachProgram } from '../../../../models/coach-program.model';

@Component({
  selector: 'app-coach-program-board',
  standalone: true,
  imports: [CommonModule, FormsModule], // ⚡ FormsModule hozzáadva
  templateUrl: './coach-program-board.component.html',
  styleUrls: ['./coach-program-board.component.css']
})
export class CoachProgramBoardComponent implements OnInit {
  private programService = inject(CoachProgramService);

  @Input() programs: CoachProgram[] = [];

  // ⚡ Kiválasztott program ID a szülővel való kétirányú bindinghoz
  @Input() selectedProgramId!: number;
  @Output() selectedProgramIdChange = new EventEmitter<number>();

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
          workouts: [], // ⚡ üres, mert itt nem kell
        }));
        console.log('✅ Programok betöltve:', this.programs);
      },
      error: (err: any) => {
        this.loading = false;
        this.message = '❌ Programok betöltése sikertelen';
        console.error('❌ Programok betöltése sikertelen', err);
      }
    });
  }

  // ⚡ Program kiválasztás kezelése
  selectProgram(programId: number) {
    this.selectedProgramId = programId;
    this.selectedProgramIdChange.emit(programId);
  }
}
