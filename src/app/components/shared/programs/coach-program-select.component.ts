import { Component, OnInit, Input, Output, EventEmitter, inject } from '@angular/core';

import { CoachProgramSelectService } from '../../../services/coach/coach-program-select/coach-program-select.service';

import { CoachProgram } from '../../../models/coach-program-select-model';

import { SHARED_IMPORTS } from '../shared-imports';

@Component({
  selector: 'app-coach-program-select',
  standalone: true,
  imports: [...SHARED_IMPORTS],
  templateUrl: './coach-program-select.component.html',
})
export class CoachProgramSelectComponent implements OnInit {
  private readonly programService = inject(CoachProgramSelectService);

  programs: CoachProgram[] = [];

  loading = false;

  message = '';

  @Input()
  selectedProgramId?: number;

  @Output()
  selectedProgramIdChange = new EventEmitter<number>();

  ngOnInit(): void {
    this.loadPrograms();
  }

  loadPrograms(): void {
    this.loading = true;

    this.programService.getMyPrograms().subscribe({
      next: (response) => {
        if (!response.success) {
          this.programs = [];

          this.message = response.message ?? 'coachProgramSelect.loadError';

          this.loading = false;

          return;
        }

        this.programs = response.data;

        this.loading = false;
      },

      error: () => {
        this.programs = [];

        this.message = 'coachProgramSelect.loadError';

        this.loading = false;
      },
    });
  }

  onProgramSelect(programId: number): void {
    this.selectedProgramId = programId;

    this.selectedProgramIdChange.emit(programId);
  }
}
