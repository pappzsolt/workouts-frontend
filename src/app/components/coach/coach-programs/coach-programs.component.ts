import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AppInputDirective } from '../../shared/components/form-controls/app-input.directive';
import { AppLoadingComponent } from '../../shared/components/app-state/app-state.component';
import { AppEmptyStateComponent } from '../../shared/components/app-state/app-state.component';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { MessageComponent } from '../../shared/components/message/message.component';
import { AppButtonComponent } from '../../shared/components/app-button/app-button.component';
import { AppCardComponent } from '../../shared/components/app-card/app-card.component';
import { AppIconComponent } from '../../shared/components/app-icon/app-icon.component';
import { AppCardBannerComponent } from '../../shared/components/app-card-banner/app-card-banner.component';
import { AppCardStatComponent } from '../../shared/components/app-card-stat/app-card-stat.component';
import { AppStatusBadgeComponent } from '../../shared/components/app-status-badge/app-status-badge.component';
import { CoachWorkspaceService } from '../../../services/coach/coach-workspace.service';
import { toIsoDate } from '../../../shared/local-date';
import type { CoachProgram } from '../../../models/coach-workspace.model';
import { errorText } from '../coach-ui';

/** A coach programjai: megnyitás a szerkesztőben, új program, törlés. */
@Component({
  selector: 'app-coach-programs',
  standalone: true,
  imports: [
    AppInputDirective,
    AppLoadingComponent,
    AppEmptyStateComponent,
    CommonModule,
    RouterModule,
    FormsModule,
    TranslatePipe,
    MessageComponent,
    AppButtonComponent,
    AppCardComponent,
    AppIconComponent,
    AppCardBannerComponent,
    AppCardStatComponent,
    AppStatusBadgeComponent,
  ],
  templateUrl: './coach-programs.component.html',
})
export class CoachProgramsComponent implements OnInit {
  private readonly workspace = inject(CoachWorkspaceService);
  private readonly destroyRef = inject(DestroyRef);

  readonly todayIso = toIsoDate(new Date());

  loading = true;
  message = '';
  messageType: 'success' | 'error' | 'info' = 'info';
  private readonly searchState = signal<string>('');
  get search(): string { return this.searchState(); }
  set search(value: string) { this.searchState.set(value); }
  private readonly programsState = signal<CoachProgram[]>([]);
  get programs(): CoachProgram[] { return this.programsState(); }
  set programs(value: CoachProgram[]) { this.programsState.set(value); }
  deleteId: number | null = null;
  deleting = false;

  private readonly sortState = signal<'dateDesc' | 'dateAsc' | 'nameAsc' | 'nameDesc'>('dateDesc');
  get sort(): 'dateDesc' | 'dateAsc' | 'nameAsc' | 'nameDesc' { return this.sortState(); }
  set sort(value: 'dateDesc' | 'dateAsc' | 'nameAsc' | 'nameDesc') { this.sortState.set(value); }
  private readonly statusFilterState = signal<'all' | 'active' | 'upcoming' | 'finished'>('all');
  get statusFilter(): 'all' | 'active' | 'upcoming' | 'finished' { return this.statusFilterState(); }
  set statusFilter(value: 'all' | 'active' | 'upcoming' | 'finished') { this.statusFilterState.set(value); }
  private readonly pageState = signal<number>(1);
  get page(): number { return this.pageState(); }
  set page(value: number) { this.pageState.set(value); }
  readonly pageSize = 12;
  clientCounts: Record<number, number> = {};

  status(program: CoachProgram): 'active' | 'upcoming' | 'finished' {
    if (program.endDate && program.endDate < this.todayIso) return 'finished';
    if (program.startDate && program.startDate > this.todayIso) return 'upcoming';
    return 'active';
  }

  private readonly statusCounts = computed(() => {
    const counts = {active: 0, upcoming: 0, finished: 0};
    for (const program of this.programs) counts[this.status(program)]++;
    return counts;
  });

  countBy(status: 'active' | 'upcoming' | 'finished'): number {
    return this.statusCounts()[status];
  }

  private readonly filteredPrograms = computed(() => {
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
  });

  get filtered(): CoachProgram[] { return this.filteredPrograms(); }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filtered.length / this.pageSize));
  }

  private readonly pagedPrograms = computed(() => {
    const page = Math.min(this.page, this.totalPages);
    return this.filtered.slice((page - 1) * this.pageSize, page * this.pageSize);
  });

  get paged(): CoachProgram[] { return this.pagedPrograms(); }

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
