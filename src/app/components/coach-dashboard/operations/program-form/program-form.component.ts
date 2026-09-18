import { Component, Input, OnDestroy, OnInit } from '@angular/core';

import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { catchError, of, Subject, takeUntil } from 'rxjs';

import { CoachProgramService } from '../../../../services/coach/coach-program/coach-program.service';
import { LanguageService } from '../../../../services/shared/language.service';

import { Program, ProgramCreationRequest } from '../../../../models/program.model';

import { SHARED_IMPORTS } from '../../../shared/shared-imports';

@Component({
  selector: 'app-program-form',
  standalone: true,
  imports: [...SHARED_IMPORTS, ReactiveFormsModule],
  templateUrl: './program-form.component.html',
  styleUrls: ['./program-form.component.css'],
})
export class ProgramFormComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  @Input()
  programId?: number;

  form!: FormGroup;

  isEditMode = false;

  message = '';

  messageType: 'success' | 'error' | 'info' | '' = '';

  constructor(
    private fb: FormBuilder,
    private programService: CoachProgramService,
    private languageService: LanguageService,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      programName: ['', Validators.required],
      programDescription: [''],
      durationDays: [null],
      difficultyLevel: [''],
    });

    // ==========================================================
    // SZERKESZTÉSI MÓD
    // ==========================================================

    if (this.programId) {
      this.isEditMode = true;

      // Nyelvváltáskor újratöltjük a programot
      this.languageService.language$.pipe(takeUntil(this.destroy$)).subscribe(() => {
        this.loadProgram();
      });
    }
  }

  // ==========================================================
  // PROGRAM BETÖLTÉSE
  // ==========================================================

  private loadProgram(): void {
    if (!this.programId) {
      return;
    }

    this.programService
      .getProgramById(this.programId)
      .pipe(
        catchError(() => {
          this.message = 'programForm.loadError';
          this.messageType = 'error';

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
          this.messageType = 'success';
        }
      });
  }

  // ==========================================================
  // SUBMIT
  // ==========================================================

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();

      this.message = 'programForm.required';
      this.messageType = 'error';

      return;
    }

    const program: Program = {
      programName: this.form.value.programName,
      programDescription: this.form.value.programDescription,
      durationDays: this.form.value.durationDays,
      difficultyLevel: this.form.value.difficultyLevel,
    };

    // ==========================================================
    // REQUEST
    // ==========================================================

    const request: ProgramCreationRequest = {
      programName: program.programName ?? '',
      programDescription: program.programDescription,
      durationDays: program.durationDays,
      difficultyLevel: program.difficultyLevel,
    };

    // ==========================================================
    // PROGRAM MÓDOSÍTÁSA
    // ==========================================================

    if (this.isEditMode && this.programId) {
      this.programService
        .updateProgram(this.programId, request)
        .pipe(
          catchError(() => {
            this.message = 'programForm.updateError';
            this.messageType = 'error';

            return of(null);
          }),
        )
        .subscribe((response) => {
          if (response?.success) {
            this.message = 'programForm.updateSuccess';
            this.messageType = 'success';
          }
        });

      return;
    }

    // ==========================================================
    // ÚJ PROGRAM LÉTREHOZÁSA
    // ==========================================================

    this.programService
      .createProgram(request)
      .pipe(
        catchError(() => {
          this.message = 'programForm.createError';
          this.messageType = 'error';

          return of(null);
        }),
      )
      .subscribe((response) => {
        if (response?.success) {
          this.message = 'programForm.createSuccess';
          this.messageType = 'success';

          this.form.reset();
        }
      });
  }

  // ==========================================================
  // DESTROY
  // ==========================================================

  ngOnDestroy(): void {
    this.destroy$.next();

    this.destroy$.complete();
  }
}
