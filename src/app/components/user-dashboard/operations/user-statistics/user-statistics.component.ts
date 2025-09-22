import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserStatisticsService,Statistic } from '../../../../services/user/user-statistics.service';

import { Observable } from 'rxjs';

@Component({
  selector: 'app-user-statistics',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-statistics.component.html',
  styleUrls: ['./user-statistics.component.css']
})
export class UserStatisticsComponent implements OnInit {
  stats$!: Observable<Statistic>;

  constructor(private statsService: UserStatisticsService) {}

  ngOnInit(): void {
    this.stats$ = this.statsService.getStatistics();
  }
}
