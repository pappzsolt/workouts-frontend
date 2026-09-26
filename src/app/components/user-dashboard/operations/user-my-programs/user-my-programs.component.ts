import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import { Observable, Subject, takeUntil } from 'rxjs';

import { UserMyProgramsService } from '../../../../services/user/user-my-program/user-my-programs.service';

import { UserProgram, ProgramProgress } from '../../../../models/program.model';
import { SidePaginationComponent } from '../../../shared/components/side-pagination/side-pagination.component';
import { LanguageService } from '../../../../services/shared/language.service';

import { SHARED_IMPORTS } from '../../../shared/shared-imports';

@Component({
  selector: 'app-user-my-programs',
  standalone: true,
  imports: [...SHARED_IMPORTS, SidePaginationComponent],
  templateUrl: './user-my-programs.component.html',
  styleUrls: ['./user-my-programs.component.css'],
})
export class UserMyProgramsComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  programs$!: Observable<UserProgram[]>;

  // ============================================================
  // PAGINATION
  // ============================================================

  private allPrograms: UserProgram[] = [];

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

  // ============================================================
  // CONSTRUCTOR
  // ============================================================

  constructor(
    private programsService: UserMyProgramsService,
    private router: Router,
    private languageService: LanguageService,
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
    this.languageService.language$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.loadPrograms();
    });
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

  private loadPrograms(): void {
    this.message = 'userMyPrograms.loading';
    this.programProgress = {};

    this.programs$ = this.programsService.getPrograms();

    this.programs$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (programs) => {
        // TELJES PROGRAMLISTA ELTÁROLÁSA

        this.allPrograms = programs ?? [];

        // ÜRES LISTA KEZELÉSE

        if (this.allPrograms.length === 0) {
          this.message = 'userMyPrograms.noPrograms';
          this.programProgress = {};

          this.totalItems = 0;
          this.currentPage = 1;
          this.paginatedPrograms = [];

          return;
        }

        this.message = '';

        // PAGINATION ADATOK FRISSÍTÉSE

        this.totalItems = this.allPrograms.length;
        this.currentPage = 1;

        this.updatePaginatedPrograms();

        // PROGRESS ADATOK LEKÉRÉSE
        // TOVÁBBRA IS AZ ÖSSZES PROGRAMHOZ

        this.programsService
          .getProgramProgress(this.allPrograms.map((program) => program.id))
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (progress) => {
              this.programProgress = Object.fromEntries(
                progress.map((item) => [item.programId, item]),
              );
            },

            error: () => {
              /*
               * Ha a progress lekérése nem sikerül,
               * a programlista ettől még megjelenik.
               */
              this.programProgress = {};
            },
          });
      },

      error: () => {
        this.message = 'userMyPrograms.loadError';
        this.programProgress = {};

        this.allPrograms = [];
        this.paginatedPrograms = [];
        this.totalItems = 0;
        this.currentPage = 1;
      },
    });
  }

  // ============================================================
  // LAPOZOTT PROGRAMOK FRISSÍTÉSE
  // ============================================================

  private updatePaginatedPrograms(): void {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;

    this.paginatedPrograms = this.allPrograms.slice(startIndex, endIndex);
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
      state: { programName },
    });
  }
}
