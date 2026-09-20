import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import { SHARED_IMPORTS } from '../../../../shared/shared-imports';
import { AppCardComponent } from '../../../../shared/components/app-card/app-card.component';
import { CoachProgramService } from '../../../../../services/coach/coach-program/coach-program.service';
import { skip } from 'rxjs';
import { AppSelectComponent } from '../../../../../components/shared/components/app-select/app-select.component';
import { LanguageService } from '../../../../../services/shared/language.service';
import { Program, ProgramCreationRequest } from '../../../../../models/program.model';

@Component({
  selector: 'app-coach-new-program',
  standalone: true,
  imports: [...SHARED_IMPORTS, AppCardComponent, AppSelectComponent],
  templateUrl: './coach-new-program.component.html',
  styleUrls: ['./coach-new-program.component.css'],
})
export class CoachNewProgramComponent implements OnInit {
  program: Program = {
    programName: '',
    programDescription: '',
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
    this.languageService.language$.pipe(skip(1)).subscribe(() => {
      this.message = '';
    });
  }

  saveProgram(): void {
    this.message = '';

    /*
     * Backend DTO:
     *
     * ProgramCreationRequest {
     *   String programName;
     *   String programDescription;
     *   Integer durationDays;
     *   String difficultyLevel;
     * }
     */

    const requestBody: ProgramCreationRequest = {
      programName: this.program.programName ?? '',
      programDescription: this.program.programDescription ?? '',
      durationDays: this.program.durationDays,
      difficultyLevel: this.program.difficultyLevel ?? '',
    };

    console.log('Program request:', requestBody);

    this.programService.createProgram(requestBody).subscribe({
      next: (response) => {
        console.log('Program created:', response);

        if (response.success) {
          this.messageType = 'success';
          this.message = 'coachNewProgram.createSuccess';

          setTimeout(() => {
            this.router.navigate(['/coach/programs']);
          }, 1500);
        } else {
          this.messageType = 'error';
          this.message = `Hiba: ${response.message}`;
        }
      },

      error: (err) => {
        console.error('Error creating program:', err);

        this.messageType = 'error';

        if (err.error?.message) {
          this.message = `Hiba: ${err.error.message}`;
        } else {
          this.message = 'coachNewProgram.createError';
        }
      },
    });
  }
}
