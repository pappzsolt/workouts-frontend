import { matchesSearch } from '../../../shared/components/app-search/search-match';
import { AppSearchComponent } from '../../../shared/components/app-search/app-search.component';
import { errorMessage, responseMessage } from '../../../../models/backend-dto/common/api-response-message';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import { EMPTY, Observable, Subject, catchError, defer, switchMap, takeUntil, tap } from 'rxjs';

import { UserMyProgramsService } from '../../../../services/user/user-my-program/user-my-programs.service';

import { ApiResponse } from '../../../../models/backend-dto/common/api-response';
import { UserProgram, ProgramProgress } from '../../../../models/program.model';
import { SidePaginationComponent } from '../../../shared/components/side-pagination/side-pagination.component';
import { LanguageService } from '../../../../services/shared/language.service';
import { ProgramExportService } from '../../../../services/shared/program-export.service';
import { AuthService } from '../../../../services/auth/auth.service';
import { downloadBlob, programExportFileName } from '../../../shared/file-download';

import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { MessageComponent } from '../../../shared/components/message/message.component';
import { AppCardComponent } from '../../../shared/components/app-card/app-card.component';
import { AppIconComponent } from '../../../shared/components/app-icon/app-icon.component';
import { AppCardBannerComponent } from '../../../shared/components/app-card-banner/app-card-banner.component';
import { AppStatusBadgeComponent } from '../../../shared/components/app-status-badge/app-status-badge.component';

@Component({
  selector: 'app-user-my-programs',
  standalone: true,
  imports: [
    AppSearchComponent,
    CommonModule,
    RouterModule,
    TranslatePipe,
    MessageComponent,
    AppCardComponent,
    AppIconComponent,
    AppCardBannerComponent,
    AppStatusBadgeComponent,
    SidePaginationComponent,
  ],
  templateUrl: './user-my-programs.component.html',
  styleUrls: ['./user-my-programs.component.css'],
})
export class UserMyProgramsComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  loadFailed = false;
  loading = false;

  // ============================================================
  // PAGINATION
  // ============================================================

  private allPrograms: UserProgram[] = [];
  searchTerm = '';

  get filteredPrograms(): UserProgram[] {
    return this.allPrograms.filter(program => matchesSearch(this.searchTerm, program.name, program.description));
  }

  onSearchChange(term: string): void {
    this.searchTerm = term;
    this.currentPage = 1;
    this.updatePaginatedPrograms();
  }

  currentPage = 1;
  pageSize = 1;

  paginatedPrograms: UserProgram[] = [];

  totalItems = 0;

  // ============================================================
  // PAGINATION GETTERS
  // ============================================================

  get totalPages(): number {
    return Math.ceil(this.totalItems / this.pageSize);
  }

  get startItem(): number {
    return this.totalItems === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1;
  }

  get endItem(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalItems);
  }

  // ============================================================
  // PROGRAM PROGRESS
  // ============================================================

  /**
   * Programonként tárolja a haladási adatokat.
   *
   * Kulcs: programId
   * Érték: az adott program progress adatai
   */
  programProgress: Partial<Record<number, ProgramProgress>> = {};

  message = 'userMyPrograms.loading';
  messageType: 'success' | 'error' | 'info' = 'info';

  // ============================================================
  // CONSTRUCTOR
  // ============================================================

  /** Az éppen exportált program azonosítója (a gomb addig nem kattintható). */
  exportingProgramId: number | null = null;

  constructor(
    private programsService: UserMyProgramsService,
    private router: Router,
    private languageService: LanguageService,
    private programExport: ProgramExportService,
    private authService: AuthService,
  ) {}

  // ============================================================
  // INIT
  // ============================================================

  ngOnInit(): void {
    /*
     * Nyelvváltás figyelése.
     *
     * A BehaviorSubject az aktuális nyelvet
     * azonnal kibocsátja, ezért az első
     * programbetöltés is innen történik.
     */
    this.languageService.language$.pipe(
      switchMap(() => this.loadPrograms()),
      takeUntil(this.destroy$),
    ).subscribe();
  }

  // ============================================================
  // DESTROY
  // ============================================================

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============================================================
  // PROGRAMOK BETÖLTÉSE
  // ============================================================

  private loadPrograms(): Observable<ApiResponse<ProgramProgress[]>> {
    return defer(() => {
      this.loading = true;
      this.loadFailed = false;
      this.messageType = 'info';
      this.message = 'userMyPrograms.loading';
      this.programProgress = {};

      return this.programsService.getPrograms().pipe(
        catchError(error => {
          this.loading = false;
          this.loadFailed = true;
          this.messageType = 'error';
          this.message = errorMessage(error, 'userMyPrograms.loadError');
          this.programProgress = {};
          this.allPrograms = [];
          this.paginatedPrograms = [];
          this.totalItems = 0;
          this.currentPage = 1;
          return EMPTY;
        }),
        tap(response => this.applyProgramsResponse(response)),
        switchMap(() => this.allPrograms.length === 0 ? EMPTY : this.loadProgress()),
      );
    });
  }

  private applyProgramsResponse(response: ApiResponse<UserProgram[]>): void {
    this.loading = false;
    this.loadFailed = !response.success;
    this.messageType = response.success ? 'info' : 'error';
    this.message = responseMessage([response], response.success ? '' : 'userMyPrograms.loadError');
    this.allPrograms = response.success ? response.data ?? [] : [];
    this.currentPage = 1;

    if (this.allPrograms.length === 0) {
      if (response.success) this.message = responseMessage([response], 'userMyPrograms.noPrograms');
      this.programProgress = {};
      this.totalItems = 0;
      this.paginatedPrograms = [];
      return;
    }

    this.updatePaginatedPrograms();
  }

  private loadProgress(): Observable<ApiResponse<ProgramProgress[]>> {
    return this.programsService.getProgramProgress(this.allPrograms.map(program => program.id)).pipe(
      tap(response => {
        if (!response.success) {
          this.programProgress = {};
          this.message = responseMessage([response], 'userMyPrograms.progressLoadError');
          this.messageType = 'error';
          return;
        }
        this.message = responseMessage([{ message: this.message }, response], '');
        this.programProgress = Object.fromEntries(
          (response.data ?? []).map(item => [item.programId, item]),
        );
      }),
      catchError(error => {
        this.message = errorMessage(error, 'userMyPrograms.progressLoadError');
        this.messageType = 'error';
        this.programProgress = {};
        return EMPTY;
      }),
    );
  }

  // ============================================================
  // LAPOZOTT PROGRAMOK FRISSÍTÉSE
  // ============================================================

  private updatePaginatedPrograms(): void {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;

    const programs = this.filteredPrograms;
    this.totalItems = programs.length;
    this.paginatedPrograms = programs.slice(startIndex, endIndex);
  }

  // ============================================================
  // LAPOZÁS
  // ============================================================

  onPageChange(page: number): void {
    if (page < 1 || page > this.totalPages) {
      return;
    }

    this.currentPage = page;

    this.updatePaginatedPrograms();
  }

  // ============================================================
  // OLDALANKÉNTI ELEMSZÁM VÁLTOZTATÁSA
  // ============================================================

  onPageSizeChange(size: number): void {
    if (size <= 0) {
      return;
    }

    this.pageSize = size;
    this.currentPage = 1;

    this.updatePaginatedPrograms();
  }

  // ============================================================
  // NAVIGÁCIÓ A PROGRAM WORKOUTS OLDALÁRA
  // ============================================================

  goToWorkouts(programId: number, programName: string | null): void {
    this.router.navigate(['/user/programs', programId, 'workouts'], {
      queryParams: { programName },
    });
  }

  // ============================================================
  // EXCEL-EXPORT
  // ============================================================

  /**
   * A program összes edzése, gyakorlata és sorozata Excel-fájlba (cél és tényleges
   * értékek, pihenő, megjegyzések). A kártya linkjét a gomb nem indítja el.
   */
  exportProgram(event: Event, program: UserProgram): void {
    event.preventDefault();
    event.stopPropagation();
    const userId = this.authService.getUserId();
    if (this.exportingProgramId !== null) return;
    if (!userId) {
      this.message = 'userMyPrograms.exportError';
      this.messageType = 'error';
      return;
    }
    this.exportingProgramId = program.id;
    this.programExport
      .exportUserProgram(userId, program.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          this.exportingProgramId = null;
          downloadBlob(blob, programExportFileName(program.name, this.authService.getUserName()));
        },
        error: (error) => {
          this.exportingProgramId = null;
          this.message = errorMessage(error, 'userMyPrograms.exportError');
          this.messageType = 'error';
        },
      });
  }

  isProgramCompleted(programId: number): boolean {
    const progress = this.programProgress[programId];
    return !!progress && progress.totalWorkouts > 0
      && progress.completedWorkouts >= progress.totalWorkouts;
  }

  remainingWorkouts(programId: number): number {
    const progress = this.programProgress[programId];
    return progress ? Math.max(0, progress.totalWorkouts - progress.completedWorkouts) : 0;
  }

  canExport(program: UserProgram): boolean {
    const total = this.programProgress[program.id]?.totalWorkouts;
    return total === undefined || total > 0;
  }

  trackByProgram(index: number, program: UserProgram): number {
    return program.id;
  }

}
