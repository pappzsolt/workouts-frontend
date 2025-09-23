import { TestBed } from '@angular/core/testing';

import { CoachEditService } from './coach-edit.service';

describe('CoachEditService', () => {
  let service: CoachEditService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CoachEditService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
