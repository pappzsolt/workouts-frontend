import { TestBed } from '@angular/core/testing';

import { CoachNewService } from './coach-new.service';

describe('CoachNewService', () => {
  let service: CoachNewService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CoachNewService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
