import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { SHARED_IMPORTS } from '../../shared/shared-imports';
import { CoachWorkspaceService, toIsoDate } from '../../../services/coach/coach-workspace.service';
import type { CoachProgram } from '../../../models/coach-workspace.model';
import { errorText } from '../coach-ui';

/** A coach programjai: megnyitás a szerkesztőben, új program, törlés. */
@Component({
  selector: 'app-coach-programs',
  standalone: true,
  imports: [...SHARED_IMPORTS],
  templateUrl: './coach-programs.component.html',
})
export class CoachProgramsComponent implements OnInit {
  private readonly workspace = inject(CoachWorkspaceService);
  private readonly destroyRef = inject(DestroyRef);

  readonly todayIso = toIsoDate(new Date());

  loading = true;
  message = '';
  messageType: 'success' | 'error' | 'info' = 'info';
  search = '';
  programs: CoachProgram[] = [];
  deleteId: number | null = null;
  deleting = false;

  get filtered(): CoachProgram[] {
    const term = this.search.trim().toLowerCase();
    return term
      ? this.programs.filter((program) => program.programName.toLowerCase().includes(term))
      : this.programs;
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.workspace
      .getCoachPrograms()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (programs) => {
          this.programs = [...programs].sort((a, b) =>
            (b.startDate ?? '').localeCompare(a.startDate ?? ''),
          );
          this.loading = false;
        },
        error: (error) => {
          this.loading = false;
          this.message = errorText(error, 'coachWorkspace.loadError');
          this.messageType = 'error';
        },
      });
  }

  askDelete(programId: number): void {
    this.deleteId = programId;
  }

  confirmDelete(): void {
    if (this.deleteId === null || this.deleting) return;
    const id = this.deleteId;
    this.deleting = true;
    this.workspace
      .deleteProgram(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.deleting = false;
          this.deleteId = null;
          this.message = 'coachWorkspace.programs.deleted';
          this.messageType = 'success';
          this.programs = this.programs.filter((program) => program.programId !== id);
        },
        error: (error) => {
          this.deleting = false;
          this.deleteId = null;
          this.message = errorText(error, 'coachWorkspace.programs.deleteError');
          this.messageType = 'error';
        },
      });
  }
}
