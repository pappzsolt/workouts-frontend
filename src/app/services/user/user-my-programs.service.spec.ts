import { TestBed } from '@angular/core/testing';

import { UserMyProgramsService } from './user-my-programs.service';

describe('UserMyProgramsService', () => {
  let service: UserMyProgramsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UserMyProgramsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
