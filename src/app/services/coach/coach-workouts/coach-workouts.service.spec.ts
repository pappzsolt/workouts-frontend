import { TestBed } from '@angular/core/testing';

import { CoachWorkoutsService } from './coach-workouts.service';

describe('CoachWorkoutsService', () => {
  let service: CoachWorkoutsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CoachWorkoutsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
