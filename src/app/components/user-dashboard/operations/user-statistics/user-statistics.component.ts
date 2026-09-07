import { Component, OnInit } from '@angular/core';

import {
  UserStatisticsService,
  Statistic,
} from '../../../../services/user/user-statistics/user-statistics.service';

import { Observable } from 'rxjs';

import { SHARED_IMPORTS } from '../../../shared/shared-imports';

@Component({
  selector: 'app-user-statistics',
  standalone: true,
  imports: [...SHARED_IMPORTS],
  templateUrl: './user-statistics.component.html',
  styleUrls: ['./user-statistics.component.css'],
})
export class UserStatisticsComponent implements OnInit {
  stats$!: Observable<Statistic>;

  constructor(private statsService: UserStatisticsService) {}

  ngOnInit(): void {
    this.stats$ = this.statsService.getStatistics();
  }
}
