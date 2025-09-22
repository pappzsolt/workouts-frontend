import { TestBed } from '@angular/core/testing';

import { CoachTrainingService } from './coach-training.service';

describe('CoachTrainingService', () => {
  let service: CoachTrainingService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CoachTrainingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
