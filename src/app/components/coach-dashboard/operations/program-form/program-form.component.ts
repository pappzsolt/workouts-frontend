import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, of } from 'rxjs';

import { CoachProgramService } from '../../../../services/coach/coach-program/coach-program.service';
import { Program } from '../../../../models/program.model';

import { SHARED_IMPORTS } from '../../../shared/shared-imports';

@Component({
  selector: 'app-program-form',
  standalone: true,
  imports: [...SHARED_IMPORTS, ReactiveFormsModule],
  templateUrl: './program-form.component.html',
  styleUrls: ['./program-form.component.css'],
})
export class ProgramFormComponent implements OnInit {
  @Input() programId?: number;

  form!: FormGroup;
  isEditMode = false;
  message = '';

  constructor(
    private fb: FormBuilder,
    private programService: CoachProgramService,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      programName: ['', Validators.required],
      programDescription: [''],
      durationDays: [null],
      difficultyLevel: [''],
    });

    // Szerkesztési mód
    if (this.programId) {
      this.isEditMode = true;

      this.programService
        .getProgramById(this.programId)
        .pipe(
          catchError(() => {
            this.message = 'programForm.loadError';

            return of(null);
          }),
        )
        .subscribe((response) => {
          if (response?.data) {
            const program = response.data;

            this.form.patchValue({
              programName: program.programName,
              programDescription: program.programDescription,
              durationDays: program.durationDays,
              difficultyLevel: program.difficultyLevel,
            });

            this.message = 'programForm.loadSuccess';
          }
        });
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();

      this.message = 'programForm.required';

      return;
    }

    const program: Program = {
      programName: this.form.value.programName,
      programDescription: this.form.value.programDescription,
      durationDays: this.form.value.durationDays,
      difficultyLevel: this.form.value.difficultyLevel,
    };

    // PROGRAM MÓDOSÍTÁSA
    if (this.isEditMode && this.programId) {
      this.programService
        .updateProgram(this.programId, program)
        .pipe(
          catchError(() => {
            this.message = 'programForm.updateError';

            return of(null);
          }),
        )
        .subscribe((response) => {
          if (response?.status === 'success') {
            this.message = 'programForm.updateSuccess';
          }
        });

      return;
    }

    // ÚJ PROGRAM LÉTREHOZÁSA
    const request = {
      programName: program.programName ?? '',
      programDescription: program.programDescription,
      durationDays: program.durationDays,
      difficultyLevel: program.difficultyLevel,
    };

    this.programService
      .createProgram(request)
      .pipe(
        catchError(() => {
          this.message = 'programForm.updateError';

          return of(null);
        }),
      )
      .subscribe((response) => {
        if (response?.success) {
          this.message = 'programForm.updateSuccess';

          this.form.reset();
        }
      });
  }
}
