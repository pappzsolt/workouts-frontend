import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { catchError, of } from 'rxjs';

import { CoachProgramService } from '../../../../services/coach/coach-program/coach-program.service';
import { Program } from '../../../../models/program.model';
import { USER_MESSAGES } from '../../../../constants/user-messages';

@Component({
  selector: 'app-program-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule
  ],
  templateUrl: './program-form.component.html',
  styleUrls: ['./program-form.component.css']
})
export class ProgramFormComponent implements OnInit {

  @Input() programId?: number;

  form!: FormGroup;
  isEditMode = false;
  message = '';

  constructor(
    private fb: FormBuilder,
    private programService: CoachProgramService
  ) {}

  ngOnInit(): void {

    this.form = this.fb.group({
      programName: ['', Validators.required],
      programDescription: [''],
      durationDays: [null],
      difficultyLevel: ['']
    });

    // Szerkesztési mód
    if (this.programId) {

      this.isEditMode = true;

      this.programService.getProgramById(this.programId).pipe(
        catchError(() => {
          this.message = USER_MESSAGES.loadProgramsError;
          return of(null);
        })
      ).subscribe(response => {

        if (response?.data) {

          const program = response.data;

          this.form.patchValue({
            programName: program.programName,
            programDescription: program.programDescription,
            durationDays: program.durationDays,
            difficultyLevel: program.difficultyLevel
          });

          this.message = USER_MESSAGES.profileLoaded;
        }
      });
    }
  }

  submit(): void {

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.message = USER_MESSAGES.required;
      return;
    }

    const program: Program = {
      programName: this.form.value.programName,
      programDescription: this.form.value.programDescription,
      durationDays: this.form.value.durationDays,
      difficultyLevel: this.form.value.difficultyLevel
    };

    // PROGRAM MÓDOSÍTÁSA
    if (this.isEditMode && this.programId) {

      this.programService
        .updateProgram(this.programId, program)
        .pipe(
          catchError(() => {
            this.message = USER_MESSAGES.updateError;
            return of(null);
          })
        )
        .subscribe(response => {

          if (response?.status === 'success') {
            this.message = USER_MESSAGES.updateSuccess;
          }
        });

      return;
    }

    // ÚJ PROGRAM LÉTREHOZÁSA
    const request = {
      programName: program.programName ?? '',
      programDescription: program.programDescription,
      durationDays: program.durationDays,
      difficultyLevel: program.difficultyLevel
    };

    this.programService
      .createProgram(request)
      .pipe(
        catchError(() => {
          this.message = USER_MESSAGES.updateError;
          return of(null);
        })
      )
      .subscribe(response => {

        if (response?.success) {
          this.message = USER_MESSAGES.updateSuccess;
          this.form.reset();
        }
      });
  }
}
