import { TestBed } from '@angular/core/testing';

import { CoachProgramService } from './coach-program.service';

describe('CoachProgramService', () => {
  let service: CoachProgramService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CoachProgramService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
