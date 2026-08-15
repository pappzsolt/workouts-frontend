import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { Program, ProgramService } from '../../../../services/coach/coach-program/program.service';
import { HttpClientModule } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { USER_MESSAGES } from '../../../../constants/user-messages';

@Component({
  selector: 'app-program-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    HttpClientModule
  ],
  templateUrl: './program-form.component.html',
})
export class ProgramFormComponent implements OnInit {

  @Input() programId?: number;

  form!: FormGroup;
  isEditMode = false;
  message = '';

  constructor(
    private fb: FormBuilder,
    private programService: ProgramService
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

      this.programService.getById(this.programId).pipe(
        catchError(error => {
          console.error('Error loading program:', error);
          this.message = USER_MESSAGES.loadProgramsError;
          return of(null);
        })
      ).subscribe(program => {

        if (program) {
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

    console.log('Program being sent:', program);

    // -----------------------------
    // PROGRAM MÓDOSÍTÁSA
    // -----------------------------
    if (this.isEditMode && this.programId) {

      this.programService.update(this.programId, program).pipe(
        catchError(error => {
          console.error('Error updating program:', error);
          this.message = USER_MESSAGES.updateError;
          return of(null);
        })
      ).subscribe(res => {

        if (res) {
          this.message = USER_MESSAGES.updateSuccess;
        }

      });

      return;
    }

    // -----------------------------
    // ÚJ PROGRAM LÉTREHOZÁSA
    // -----------------------------
    this.programService.create(program).pipe(
      catchError(error => {
        console.error('Error creating program:', error);
        this.message = USER_MESSAGES.updateError;
        return of(null);
      })
    ).subscribe(res => {

      if (res) {
        console.log('Program created:', res);
        this.message = USER_MESSAGES.updateSuccess;
        this.form.reset();
      }

    });
  }
}
