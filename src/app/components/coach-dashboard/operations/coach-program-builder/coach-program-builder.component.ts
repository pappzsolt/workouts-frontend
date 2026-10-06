import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { SHARED_IMPORTS } from '../../../shared/shared-imports';
import { ProgramBuilderDocumentStore } from '../../../../services/coach/program-builder/program-builder-document.store';
import { ProgramBuilderAssignmentStore } from '../../../../services/coach/program-builder/program-builder-assignment.store';
import { ProgramDetailsFormComponent } from './program-details-form.component';
import { CoachProgramBuilderWorkoutsComponent } from './coach-program-builder-workouts.component';

/** Coordinates route and steps. Form, document persistence and assignment each have one owner. */
@Component({
  selector: 'app-coach-program-builder', standalone: true,
  imports: [...SHARED_IMPORTS, ProgramDetailsFormComponent, CoachProgramBuilderWorkoutsComponent],
  providers: [ProgramBuilderDocumentStore, ProgramBuilderAssignmentStore],
  templateUrl: './coach-program-builder.component.html',
  styleUrl: './coach-program-builder.component.css',
})
export class CoachProgramBuilderComponent implements OnInit {
  readonly document = inject(ProgramBuilderDocumentStore);
  readonly assignment = inject(ProgramBuilderAssignmentStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  currentStep = 1;
  programId: number | null = null;
  isEditMode = false;
  message = '';
  messageType: 'success' | 'error' | 'info' = 'info';

  ngOnInit(): void {
    const value = this.route.snapshot.queryParamMap.get('programId');
    if (value !== null) {
      const id = Number(value);
      if (!Number.isInteger(id) || id <= 0) { this.fail(new Error('coachProgramBuilder.invalidProgramId')); return; }
      this.programId = id;
      this.isEditMode = true;
      this.assignment.loaded = false;
      this.currentStep = this.route.snapshot.queryParamMap.has('newWorkoutId') ? 2 : 1;
      this.loadProgram();
    }
  }

  loadProgram(): void {
    if (this.programId === null) return;
    const id = this.programId;
    this.document.load(id, () => this.assignment.load(id, error => this.fail(error)), error => this.fail(error));
  }

  saveProgram(): void {
    if (this.document.busy) return;
    try {
      this.document.save(this.programId).subscribe({
        next: id => { this.programId = id; this.currentStep = 2; },
        error: error => this.fail(error),
      });
    } catch (error) { this.fail(error); }
  }

  finishProgram(): void {
    if (this.programId === null || this.assignment.busy) return;
    const id = this.programId;
    try {
      this.assignment.save(id).subscribe({
        next: () => this.router.navigate(['/coach/dashboard'], { queryParams: { section: 'assignments', programId: id } }),
        error: error => this.fail(error),
      });
    } catch (error) { this.fail(error); }
  }

  goToCreateWorkout(): void {
    if (this.programId === null) return;
    this.router.navigate(['/coach/workouts/new'], { queryParams: { fromProgramBuilder: 'true', programId: this.programId } });
  }

  previousStep(): void {
    if (this.isEditMode) this.router.navigate(['/coach/dashboard'], { queryParams: { section: 'programs' } });
    else this.currentStep = 1;
  }

  private fail(error: unknown): void {
    this.message = error instanceof HttpErrorResponse ? error.error?.message || 'coachProgramBuilder.loadProgramError'
      : error instanceof Error ? error.message : 'coachProgramBuilder.loadProgramError';
    this.messageType = 'error';
  }
}
