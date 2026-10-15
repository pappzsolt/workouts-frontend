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

  sort: 'dateDesc' | 'dateAsc' | 'nameAsc' | 'nameDesc' = 'dateDesc';
  statusFilter: 'all' | 'active' | 'upcoming' | 'finished' = 'all';
  page = 1;
  readonly pageSize = 12;
  clientCounts: Record<number, number> = {};

  status(program: CoachProgram): 'active' | 'upcoming' | 'finished' {
    if (program.endDate && program.endDate < this.todayIso) return 'finished';
    if (program.startDate && program.startDate > this.todayIso) return 'upcoming';
    return 'active';
  }

  countBy(status: 'active' | 'upcoming' | 'finished'): number {
    return this.programs.filter((program) => this.status(program) === status).length;
  }

  get filtered(): CoachProgram[] {
    const term = this.search.trim().toLowerCase();
    const list = this.programs.filter(
      (program) =>
        (!term || program.programName.toLowerCase().includes(term)) &&
        (this.statusFilter === 'all' || this.status(program) === this.statusFilter),
    );
    const byDate = (a: CoachProgram, b: CoachProgram) => (a.startDate ?? '').localeCompare(b.startDate ?? '');
    const byName = (a: CoachProgram, b: CoachProgram) => a.programName.localeCompare(b.programName);
    switch (this.sort) {
      case 'dateAsc': return list.sort(byDate);
      case 'nameAsc': return list.sort(byName);
      case 'nameDesc': return list.sort((a, b) => byName(b, a));
      default: return list.sort((a, b) => byDate(b, a));
    }
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filtered.length / this.pageSize));
  }

  get paged(): CoachProgram[] {
    const page = Math.min(this.page, this.totalPages);
    return this.filtered.slice((page - 1) * this.pageSize, page * this.pageSize);
  }

  setFilter(filter: 'all' | 'active' | 'upcoming' | 'finished'): void {
    this.statusFilter = filter;
    this.page = 1;
  }

  onSearchChange(): void {
    this.page = 1;
  }

  goToPage(page: number): void {
    this.page = Math.min(Math.max(1, page), this.totalPages);
  }

  clientCount(programId: number): number {
    return this.clientCounts[programId] ?? 0;
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.workspace
      .assignmentCounts()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (counts) => (this.clientCounts = counts), error: () => (this.clientCounts = {}) });
    this.workspace
      .getCoachPrograms()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (programs) => {
          this.programs = programs;
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
