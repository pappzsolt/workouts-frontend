import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { of, Subject } from 'rxjs';
import { AssignProgramComponent } from './assignprogram.component';
import { AssignProgramService } from '../../../../services/coach/assign-program/assignprogram.service';
import { UserNameIdService } from '../../../../services/user/user-name-id.service';
import { LanguageService } from '../../../../services/shared/language.service';

describe('AssignProgramComponent response handling', () => {
  let api: jasmine.SpyObj<AssignProgramService>;
  let component: AssignProgramComponent;
  beforeEach(() => {
    api = jasmine.createSpyObj('AssignProgramService', ['assignProgramToUser', 'revokeProgramFromUser', 'getAssignedUserIds']);
    TestBed.configureTestingModule({ providers: [
      { provide: AssignProgramService, useValue: api },
      { provide: UserNameIdService, useValue: {} },
      { provide: ActivatedRoute, useValue: {} },
      { provide: TranslateService, useValue: { instant: (key: string) => key } },
      { provide: LanguageService, useValue: {} },
    ] });
    component = TestBed.runInInjectionContext(() => new AssignProgramComponent());
    component.users = [{ id: 1, username: 'User' }];
    component.usersReady = true; component.programReady = true; component.assignmentStateReady = true;
    component.userId = 1; component.selectedProgramId = 7; component.assignedUserIds = [];
  });
  afterEach(() => component.ngOnDestroy());

  it('reports success:false as an error even with a normal HTTP response', () => {
    api.assignProgramToUser.and.returnValue(of({ success: false, data: null, message: 'denied' }));
    component.assignProgram();
    expect(component.success).toBeFalse(); expect(component.message).toBe('denied');
    expect(component.loading).toBeFalse();
  });

  it('rejects invalid IDs and users outside the loaded list', () => {
    component.selectedProgramId = -7; component.assignProgram();
    component.selectedProgramId = 7; component.userId = 2; component.assignProgram();
    expect(api.assignProgramToUser).not.toHaveBeenCalled();
  });

  it('prevents concurrent assignments and clears loading on destruction', () => {
    api.assignProgramToUser.and.returnValue(new Subject<any>());
    component.assignProgram(); component.assignProgram();
    expect(api.assignProgramToUser).toHaveBeenCalledTimes(1);
    component.ngOnDestroy(); expect(component.loading).toBeFalse();
  });


  it('revokes an existing assignment and removes it from local state only after success', () => {
    component.assignedUserIds = [1];
    api.revokeProgramFromUser.and.returnValue(of({ success: true, data: null, message: 'revoked' }));

    component.revokeProgram();

    expect(api.revokeProgramFromUser).toHaveBeenCalledOnceWith(1, 7);
    expect(component.assignedUserIds).toEqual([]);
    expect(component.message).toBe('revoked');
    expect(component.success).toBeTrue();
  });

  it('does not call assign for an already assigned user', () => {
    component.assignedUserIds = [1];
    component.assignProgram();
    expect(api.assignProgramToUser).not.toHaveBeenCalled();
  });
});
