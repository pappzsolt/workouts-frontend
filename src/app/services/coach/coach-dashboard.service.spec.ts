import { TestBed } from '@angular/core/testing';

import { CoachDashboardService } from './coach-dashboard.service';

describe('CoachDashboardService', () => {
  let service: CoachDashboardService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CoachDashboardService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
