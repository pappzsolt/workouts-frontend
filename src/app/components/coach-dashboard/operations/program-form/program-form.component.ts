import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Program, ProgramService } from '../../../../services/coach/coach-program/program.service';
import { HttpClientModule } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { USER_MESSAGES } from '../../../../constants/user-messages';

@Component({
  selector: 'app-program-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule],
  templateUrl: './program-form.component.html',
})
export class ProgramFormComponent implements OnInit {

  @Input() programId?: number;

  form!: FormGroup;
  isEditMode = false;
  message: string = '';

  constructor(private fb: FormBuilder, private programService: ProgramService) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      duration_days: [null],
      difficulty_level: [''],
      coach_id: [null]
    });

    if (this.programId) {
      this.isEditMode = true;
      this.programService.getById(this.programId).pipe(
        catchError(() => {
          this.message = USER_MESSAGES.loadProgramsError;
          return of(null);
        })
      ).subscribe(program => {
        if (program) {
          this.form.patchValue(program);
          this.message = USER_MESSAGES.profileLoaded;
        }
      });
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.message = USER_MESSAGES.required;
      return;
    }

    const program: Program = this.form.value;

    if (this.isEditMode && this.programId) {
      this.programService.update(this.programId, program).pipe(
        catchError(() => {
          this.message = USER_MESSAGES.updateError;
          return of(null);
        })
      ).subscribe(res => {
        if (res) {
          this.message = USER_MESSAGES.updateSuccess;
        }
      });
    } else {
      this.programService.create(program).pipe(
        catchError(() => {
          this.message = USER_MESSAGES.updateError;
          return of(null);
        })
      ).subscribe(res => {
        if (res) {
          this.message = USER_MESSAGES.updateSuccess;
          this.form.reset();
        }
      });
    }
  }
}
