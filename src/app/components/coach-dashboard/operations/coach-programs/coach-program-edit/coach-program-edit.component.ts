import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { CoachProgramService } from '../../../../../services/coach/coach-program/coach-program.service';
import { AppCardComponent } from '../../../../shared/components/app-card/app-card.component';
import { Program, ProgramCreationRequest } from '../../../../../models/program.model';
import { AppSelectComponent } from '../../../../../components/shared/components/app-select/app-select.component';
import { SHARED_IMPORTS } from '../../../../shared/shared-imports';

@Component({
  selector: 'app-coach-program-edit',
  standalone: true,
  imports: [...SHARED_IMPORTS, AppCardComponent, AppSelectComponent],
  templateUrl: './coach-program-edit.component.html',
  styleUrls: ['./coach-program-edit.component.css'],
})
export class CoachProgramEditComponent implements OnInit {
  program: Program = {
    programName: '',
    programDescription: '',
    startDate: '',
    endDate: '',
    durationDays: 0,
    difficultyLevel: '',
  };

  message = '';
  messageType: 'success' | 'error' | '' = '';

  constructor(
    private route: ActivatedRoute,
    private programService: CoachProgramService,
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    if (!id) {
      this.setMessage('coachProgramEdit.idNotFound', 'error');

      return;
    }

    this.programService.getProgramById(id).subscribe({
      next: (res) => {
        if (res?.success && res.data) {
          const dto = res.data;

          if (dto.programId == null || dto.programName == null) {
            this.setMessage('coachProgramEdit.notFound', 'error');
            return;
          }

          this.program = {
            id: dto.programId,
            programName: dto.programName,
            programDescription: dto.programDescription ?? '',
            startDate: dto.startDate ?? '',
            endDate: dto.endDate ?? '',
            durationDays: dto.durationDays ?? undefined,
            difficultyLevel: dto.difficultyLevel ?? undefined,
          };
        } else {
          this.setMessage('coachProgramEdit.notFound', 'error');
        }
      },

      error: (err) => {
        console.error(err);

        this.setMessage('coachProgramEdit.loadError', 'error');
      },
    });
  }

  calculateEndDate(startDate?: string, durationDays?: number): string {
    if (!startDate || !durationDays || durationDays <= 0) {
      return '';
    }

    const date = new Date(`${startDate}T00:00:00`);
    date.setDate(date.getDate() + durationDays);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  saveProgram(): void {
    if (!this.program.id) {
      this.setMessage('coachProgramEdit.idNotFound', 'error');

      return;
    }

    const request: ProgramCreationRequest = {
      programName: this.program.programName ?? '',
      programDescription: this.program.programDescription ?? '',
      startDate: this.program.startDate || null,
      durationDays: this.program.durationDays ?? 0,
      difficultyLevel: this.program.difficultyLevel ?? '',
    };

    this.programService.updateProgram(this.program.id, request).subscribe({
      next: (res) => {
        if (res.success) {
          this.setMessage('coachProgramEdit.saveSuccess', 'success');
        } else {
          this.setMessage(res.message || 'coachProgramEdit.saveError', 'error');
        }
      },

      error: (err) => {
        console.error(err);

        this.setMessage('coachProgramEdit.saveError', 'error');
      },
    });
  }

  private setMessage(message: string, type: 'success' | 'error'): void {
    this.message = message;
    this.messageType = type;
  }
}
