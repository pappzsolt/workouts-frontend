import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { CoachProgramService } from '../../../../../services/coach/coach-program/coach-program.service';

import { Program, ProgramDto, ProgramCreationRequest } from '../../../../../models/program.model';

import { SHARED_IMPORTS } from '../../../../shared/shared-imports';

@Component({
  selector: 'app-coach-program-edit',
  standalone: true,
  imports: [...SHARED_IMPORTS],
  templateUrl: './coach-program-edit.component.html',
  styleUrls: ['./coach-program-edit.component.css'],
})
export class CoachProgramEditComponent implements OnInit {
  program: Program = {
    programName: '',
    programDescription: '',
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
          const dto: ProgramDto = res.data;

          this.program = {
            id: dto.programId,
            programName: dto.programName,
            programDescription: dto.programDescription,
            durationDays: dto.durationDays,
            difficultyLevel: dto.difficultyLevel,
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

  saveProgram(): void {
    if (!this.program.id) {
      this.setMessage('coachProgramEdit.idNotFound', 'error');

      return;
    }

    const request: ProgramCreationRequest = {
      programName: this.program.programName ?? '',
      programDescription: this.program.programDescription ?? '',
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
