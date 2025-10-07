import { Component, OnInit, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CoachProgramService } from '../../../services/coach/assign-program/coach-program.service';

export interface CoachProgram {
  programId: number;
  programName: string;
  programDescription?: string;
  durationDays?: number;
  difficultyLevel?: string;
}

@Component({
  selector: 'app-coach-program-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './coach-program-select.component.html'
})
export class CoachProgramSelectComponent implements OnInit {
  private programService = inject(CoachProgramService);

  programs: CoachProgram[] = [];
  loading = false;
  message = '';

  @Input() selectedProgramId?: number;
  @Output() selectedProgramIdChange = new EventEmitter<number>();

  ngOnInit() {
    this.loadPrograms();
  }

  loadPrograms() {
    this.loading = true;
    this.programService.getMyPrograms().subscribe({
      next: (res: CoachProgram[]) => {
        this.programs = res;
        this.loading = false;
      },
      error: (err: any) => {
        console.error('❌ Programok betöltése sikertelen', err);
        this.message = 'Hiba a programok lekérése során';
        this.loading = false;
      }
    });
  }

  onProgramSelect(programId: number) {
    this.selectedProgramId = programId;
    this.selectedProgramIdChange.emit(programId);
  }
}
