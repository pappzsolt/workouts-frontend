import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, takeUntil } from 'rxjs';

import type { ApiResponse } from '../../../../models/backend-dto/common/api-response';
import {
  ProgramStatistics,
  ProgramStatisticsProgram,
} from '../../../../models/user-program-statistics.model';
import { LanguageService } from '../../../../services/shared/language.service';
import { UserProgramStatisticsService } from '../../../../services/user/user-program-statistics.service';
import { SHARED_IMPORTS } from '../../../shared/shared-imports';

@Component({
  selector: 'app-user-program-statistics',
  standalone: true,
  imports: [...SHARED_IMPORTS],
  templateUrl: './program-statistics.component.html',
  styleUrl: './program-statistics.component.css',
})
export class UserProgramStatisticsComponent implements OnInit, OnDestroy {
  private readonly statisticsService = inject(UserProgramStatisticsService);
  private readonly languageService = inject(LanguageService);
  private readonly destroy$ = new Subject<void>();

  programs: ProgramStatisticsProgram[] = [];
  totalPrograms = 0;
  completedPrograms = 0;

  loading = false;
  message = '';
  messageType: 'success' | 'error' | '' = '';

  programPage = 1;
  programPageSize = 6;

  ngOnInit(): void {
    this.languageService.language$
      .pipe(takeUntil(this.destroy$))
      .subscribe((language) => this.loadStatistics(language));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get pagedPrograms(): ProgramStatisticsProgram[] {
    const start = (this.programPage - 1) * this.programPageSize;
    return this.programs.slice(start, start + this.programPageSize);
  }

  onPageChange(page: number): void {
    this.programPage = page;
  }

  onPageSizeChange(pageSize: number): void {
    this.programPageSize = pageSize;
    this.programPage = 1;
  }

  loadStatistics(language: string): void {
    this.loading = true;
    this.message = '';
    this.messageType = '';

    this.statisticsService.getProgramStatistics(language).subscribe({
      next: (response: ApiResponse<ProgramStatistics>) => {
        this.loading = false;

        if (!response.success || !response.data) {
          this.resetStatistics();
          this.message = response.message || 'userProgramStatistics.loadError';
          this.messageType = 'error';
          return;
        }

        this.totalPrograms = response.data.totalPrograms ?? 0;
        this.completedPrograms = response.data.completedPrograms ?? 0;
        this.programs = response.data.programs ?? [];
        this.programPage = 1;

        if (!this.programs.length) {
          this.message = 'userProgramStatistics.noPrograms';
        }
      },
      error: (error: HttpErrorResponse) => {
        this.loading = false;
        this.resetStatistics();
        this.message = error.error?.message || 'userProgramStatistics.loadError';
        this.messageType = 'error';
        console.error('Program statisztikák betöltése sikertelen:', error);
      },
    });
  }

  private resetStatistics(): void {
    this.programs = [];
    this.totalPrograms = 0;
    this.completedPrograms = 0;
    this.programPage = 1;
  }
}
