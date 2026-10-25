import { ProgramStrengthOverviewComponent } from './program-strength-overview.component';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { LoggerService } from '../../../../services/logger.service';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, Subscription, takeUntil } from 'rxjs';

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
  imports: [...SHARED_IMPORTS, ProgramStrengthOverviewComponent],
  templateUrl: './program-statistics.component.html',
  styleUrl: './program-statistics.component.css',
})
export class UserProgramStatisticsComponent implements OnInit, OnDestroy {
  private readonly logger = inject(LoggerService);

  private readonly statisticsService = inject(UserProgramStatisticsService);
  private readonly languageService = inject(LanguageService);
  private readonly destroy$ = new Subject<void>();
  private statisticsRequest?: Subscription;

  programs: ProgramStatisticsProgram[] = [];
  totalPrograms = 0;
  completedPrograms = 0;

  loading = false;
  message = '';
  messageType: 'success' | 'error' | '' = '';

  programPage = 1;
  readonly programPageSize = 1;

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
    if (page >= 1 && page <= this.programs.length) {
      this.programPage = page;
    }
  }


  /** A program állapotcímkéje: teljesítve, befejezett (lejárt), hamarosan induló vagy folyamatban. */
  programStatus(program: ProgramStatisticsProgram): 'COMPLETED' | 'FINISHED' | 'UPCOMING' | 'ACTIVE' {
    return program.status ?? (program.completed ? 'COMPLETED' : 'ACTIVE');
  }

  programStatusKey(program: ProgramStatisticsProgram): string {
    return {
      COMPLETED: 'userProgramStatistics.completed',
      FINISHED: 'userProgramStatistics.finished',
      UPCOMING: 'userProgramStatistics.upcoming',
      ACTIVE: 'userProgramStatistics.inProgress',
    }[this.programStatus(program)];
  }

  programStatusClass(program: ProgramStatisticsProgram): string {
    return {
      COMPLETED: 'bg-success-50 text-success-700',
      FINISHED: 'bg-surface-100 text-content-700',
      UPCOMING: 'bg-info-50 text-info-700',
      ACTIVE: 'bg-warning-50 text-warning-700',
    }[this.programStatus(program)];
  }

  loadStatistics(language: string): void {
    this.statisticsRequest?.unsubscribe();
    this.loading = true;
    this.message = '';
    this.messageType = '';

    this.statisticsRequest = this.statisticsService.getProgramStatistics(language).pipe(takeUntil(this.destroy$)).subscribe({
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
        for (const program of this.programs) {
          if (!this.sbdSelections[program.programId]) this.sbdSelections[program.programId] = defaultMainLifts(program);
        }
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
        this.logger.error('Program statisztikák betöltése sikertelen:', error);
      },
    });
  }

  private resetStatistics(): void {
    this.programs = [];
    this.totalPrograms = 0;
    this.completedPrograms = 0;
    this.programPage = 1;
  }

  private readonly sbdSelections: Record<number, number[]> = {};

  sbdSelection(programId: number): number[] {
    return this.sbdSelections[programId] ??= [0, 0, 0];
  }

  setSbdExercise(programId: number, lift: number, exerciseId: number): void {
    const selection = [...this.sbdSelection(programId)];
    selection[lift] = Number(exerciseId);
    this.sbdSelections[programId] = selection;
  }

  sbdWeeks(program: ProgramStatisticsProgram): { week: number; estimatedTotalKg: number; singleTotalKg: number | null }[] {
    const ids = this.sbdSelection(program.programId);
    if (ids.includes(0) || new Set(ids).size !== 3) return [];
    const exercises = ids.map(id => program.exerciseStatistics.find(exercise => exercise.exerciseId === id));
    if (exercises.some(exercise => !exercise)) return [];
    return exercises[0]!.weeks.flatMap(firstWeek => {
      const metrics = exercises.map(exercise => exercise!.weeks.find(week => week.week === firstWeek.week)?.metrics);
      if (metrics.some(value => value?.estimatedOneRepMaxKg == null)) return [];
      return [{
        week: firstWeek.week,
        estimatedTotalKg: metrics.reduce((sum, value) => sum + value!.estimatedOneRepMaxKg!, 0),
        singleTotalKg: metrics.every(value => value?.bestSingleKg != null)
          ? metrics.reduce((sum, value) => sum + value!.bestSingleKg!, 0) : null,
      }];
    });
  }

  maxVolume(program: ProgramStatisticsProgram): number {
    return Math.max(0, ...program.weeklyVolumes.map(week => week.volumeKg));
  }

  weeklyBarWidth(volume: number, maximum: number): number {
    return maximum > 0 ? (volume / maximum) * 100 : 0;
  }

  trackByProgram(index: number, program: ProgramStatisticsProgram): number {
    return program.programId;
  }

}

/** Conservative exact aliases; ambiguous matches remain unselected. */
export function defaultMainLifts(program: ProgramStatisticsProgram): number[] {
  const normalize = (name: string) => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');
  const aliases = [
    ['guggolas', 'guggolas ruddal', 'squat', 'back squat', 'barbell squat', 'barbell back squat', 'kniebeuge', 'kniebeugen', 'langhantelkniebeuge'],
    ['fekvenyomas', 'fekvenyomas ruddal', 'bench press', 'barbell bench press', 'bankdrucken', 'langhantel-bankdrucken'],
    ['felhuzas', 'felhuzas ruddal', 'deadlift', 'barbell deadlift', 'conventional deadlift', 'kreuzheben'],
  ];
  return aliases.map(names => {
    const matches = program.exerciseStatistics.filter(exercise => names.includes(normalize(exercise.exerciseName)));
    return matches.length === 1 ? matches[0].exerciseId : 0;
  });
}
