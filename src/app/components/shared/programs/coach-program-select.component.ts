import {
  Component,
  OnInit,
  Input,
  Output,
  EventEmitter,
  inject
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { CoachProgramSelectService } from '../../../services/coach/coach-program-select/coach-program-select.service';
import { CoachProgram } from '../../../models/coach-program-select-model';

@Component({
  selector: 'app-coach-program-select',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './coach-program-select.component.html'
})
export class CoachProgramSelectComponent implements OnInit {

  private programService = inject(CoachProgramSelectService);

  programs: CoachProgram[] = [];
  loading = false;
  message = '';

  @Input() selectedProgramId?: number;
  @Output() selectedProgramIdChange = new EventEmitter<number>();

  ngOnInit(): void {
    this.loadPrograms();
  }

  loadPrograms(): void {
    this.loading = true;

    this.programService.getMyPrograms().subscribe({
      next: (programs: CoachProgram[]) => {
        this.programs = programs;
        this.loading = false;
      },
      error: () => {
        this.message = 'Hiba a programok lekérése során';
        this.loading = false;
      }
    });
  }

  onProgramSelect(programId: number): void {
    this.selectedProgramId = programId;
    this.selectedProgramIdChange.emit(programId);
  }
}
