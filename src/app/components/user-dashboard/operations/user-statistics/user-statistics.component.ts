import { Component, OnDestroy, OnInit } from '@angular/core';

import {
  UserStatisticsService,
  Statistic,
} from '../../../../services/user/user-statistics/user-statistics.service';

import { Observable, Subject, takeUntil } from 'rxjs';

import { LanguageService } from '../../../../services/shared/language.service';

import { SHARED_IMPORTS } from '../../../shared/shared-imports';

@Component({
  selector: 'app-user-statistics',
  standalone: true,
  imports: [...SHARED_IMPORTS],
  templateUrl: './user-statistics.component.html',
  styleUrls: ['./user-statistics.component.css'],
})
export class UserStatisticsComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  stats$!: Observable<Statistic>;

  constructor(
    private statsService: UserStatisticsService,
    private languageService: LanguageService,
  ) {}

  ngOnInit(): void {
    /*
     * Nyelvváltás figyelése.
     *
     * A BehaviorSubject az aktuális nyelvet
     * azonnal kibocsátja, ezért az első
     * statisztika betöltés is innen történik.
     */
    this.languageService.language$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.loadStatistics();
    });
  }

  private loadStatistics(): void {
    this.stats$ = this.statsService.getStatistics();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
