import { Component, OnInit, Input, Output, EventEmitter, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { CoachProgramSelectService } from '../../../services/coach/coach-program-select/coach-program-select.service';

import type { CoachProgram } from '../../../models/coach-program.model';

import { SHARED_IMPORTS } from '../shared-imports';

@Component({
  selector: 'app-coach-program-select',
  standalone: true,
  imports: [...SHARED_IMPORTS],
  templateUrl: './coach-program-select.component.html',
})
export class CoachProgramSelectComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

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

    this.programService.getMyPrograms().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        if (!response.success) {
          this.programs = [];

          this.message = response.message ?? 'coachProgramSelect.loadError';

          this.loading = false;

          return;
        }

        this.programs = response.data ?? [];

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

  trackByProgram(index: number, program: CoachProgram): number {
    return program.programId;
  }

}
