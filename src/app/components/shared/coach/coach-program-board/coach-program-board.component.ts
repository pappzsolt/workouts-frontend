import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, inject } from '@angular/core';

import { Subject, takeUntil } from 'rxjs';

import { CoachProgramService } from '../../../../services/coach/coach-program/coach-program.service';
import { LanguageService } from '../../../../services/shared/language.service';

import { CoachProgram } from '../../../../models/coach-program.model';
import { ProgramDto } from '../../../../models/program.model';

import { SHARED_IMPORTS } from '../../shared-imports';

@Component({
  selector: 'app-coach-program-board',
  standalone: true,
  imports: [...SHARED_IMPORTS],
  templateUrl: './coach-program-board.component.html',
  styleUrls: ['./coach-program-board.component.css'],
})
export class CoachProgramBoardComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  private programService = inject(CoachProgramService);

  private languageService = inject(LanguageService);

  @Input()
  programs: CoachProgram[] = [];

  @Output()
  programSelected = new EventEmitter<number>();

  selectedProgramId: number | null = null;

  loading = false;

  message = '';

  // ==========================================================
  // INIT
  // ==========================================================

  ngOnInit(): void {
    if (!this.programs?.length) {
      this.loadPrograms();
    }

    // ==========================================================
    // NYELVVÁLTÁS
    // ==========================================================

    this.languageService.language$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.loadPrograms();
    });
  }

  // ==========================================================
  // PROGRAMOK BETÖLTÉSE
  // ==========================================================

  loadPrograms(): void {
    this.loading = true;

    this.message = '';

    this.programService.getProgramsForLoggedInCoach().subscribe({
      next: (res) => {
        this.loading = false;

        this.programs = (res.data as ProgramDto[]).map((p) => ({
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

        this.message = 'coachProgramBoard.loadError';

        console.error('❌ Programok betöltése sikertelen', err);
      },
    });
  }

  // ==========================================================
  // PROGRAM KIVÁLASZTÁSA
  // ==========================================================

  onSelectProgram(id: number): void {
    this.selectedProgramId = id;

    this.programSelected.emit(id);
  }

  // ==========================================================
  // DESTROY
  // ==========================================================

  ngOnDestroy(): void {
    this.destroy$.next();

    this.destroy$.complete();
  }
}
