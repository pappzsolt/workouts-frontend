import { errorMessage, responseMessage } from '../../../../../models/backend-dto/common/api-response-message';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { LoggerService } from '../../../../../services/logger.service';
import { Router } from '@angular/router';

import { SHARED_IMPORTS } from '../../../../shared/shared-imports';
import { AppCardComponent } from '../../../../shared/components/app-card/app-card.component';
import { CoachProgramService } from '../../../../../services/coach/coach-program/coach-program.service';
import { skip, timer } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AppSelectComponent } from '../../../../../components/shared/components/app-select/app-select.component';
import { LanguageService } from '../../../../../services/shared/language.service';
import { Program } from '../../../../../models/program.model';
import type { ProgramCreationRequest } from '../../../../../models/backend-dto/programcreator/program-creation-request';
import { AppButtonComponent } from '../../../../../components/shared/components/app-button/app-button.component';
@Component({
  selector: 'app-coach-new-program',
  standalone: true,
  imports: [...SHARED_IMPORTS, AppCardComponent, AppSelectComponent, AppButtonComponent],
  templateUrl: './coach-new-program.component.html',
  styleUrls: ['./coach-new-program.component.css'],
})
export class CoachNewProgramComponent implements OnInit {
  private readonly logger = inject(LoggerService);

  private readonly destroyRef = inject(DestroyRef);

  program: Program = {
    programName: '',
    programDescription: '',
    startDate: '',
    endDate: '',
    durationDays: 0,
    difficultyLevel: '',
  };

  message = '';
  messageType: 'success' | 'error' = 'success';

  constructor(
    private programService: CoachProgramService,
    private router: Router,
    private languageService: LanguageService,
  ) {}

  ngOnInit(): void {
    this.languageService.language$
      .pipe(skip(1), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
      this.message = '';
    });
  }

  calculateEndDate(startDate?: string, durationDays?: number): string {
    if (!startDate || !durationDays || durationDays <= 0) {
      return '';
    }

    const date = new Date(`${startDate}T00:00:00`);
    date.setDate(date.getDate() + durationDays - 1);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  saveProgram(): void {
    this.message = '';

    if (!this.program.startDate) {
      this.messageType = 'error';
      this.message = 'coachNewProgram.startDateRequired';
      return;
    }

    /*
     * Backend DTO:
     *
     * ProgramCreationRequest {
     *   String programName;
     *   String programDescription;
     *   LocalDate startDate;
     *   Integer durationDays;
     *   LocalDate endDate; // backend számítja ki
     *   String difficultyLevel;
     * }
     */

    const requestBody: ProgramCreationRequest = {
      programName: this.program.programName ?? null,
      programDescription: this.program.programDescription ?? null,
      startDate: this.program.startDate || null,
      durationDays: this.program.durationDays ?? null,
      difficultyLevel: this.program.difficultyLevel ?? null,
      userId: null,
      languageCode: this.languageService.getCurrentLanguage(),
      workouts: null,
    };


    this.programService.createProgram(requestBody).subscribe({
      next: (response) => {

        if (response.success) {
          this.messageType = 'success';
          this.message = responseMessage([response], 'coachNewProgram.createSuccess');

          timer(1500)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => {
              void this.router.navigate(['/coach/programs']);
            });
        } else {
          this.messageType = 'error';
          this.message = response.message || 'coachNewProgram.createError';
        }
      },

      error: (err) => {
        this.logger.error('Error creating program:', err);

        this.messageType = 'error';

        this.message = errorMessage(err, 'coachNewProgram.createError');
      },
    });
  }
}
