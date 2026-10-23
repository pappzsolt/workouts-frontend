import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { UserEditComponent } from './user-edit.component';
import { CoachSelectComponent } from '../../../shared/coach/coach-select.component';
import { UserEditService } from '../../../../services/admin/user-edit.service';
import { RoleService } from '../../../../services/roles/role.service';
import { CoachNameIdService } from '../../../../services/coach/coach-name-id.service';
import { LoggerService } from '../../../../services/logger.service';
import { API_ENDPOINTS } from '../../../../api-endpoints';
import type { ChangeDetectorRef } from '@angular/core';

describe('Admin user coach assignment removal', () => {
  let editor: UserEditComponent;
  let selector: CoachSelectComponent;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(),
      { provide: LoggerService, useValue: { error() {} } },
    ] });
    http = TestBed.inject(HttpTestingController);
    editor = TestBed.runInInjectionContext(() => new UserEditComponent(
      TestBed.inject(UserEditService), {} as RoleService, { detectChanges() {} } as ChangeDetectorRef,
    ));
    editor.ready = true;
    editor.coaches = [{ id: 9, name: 'Trainer' }, { id: 10, name: 'Other trainer' }];
    editor.selectedUser = { id: 7, username: 'Anna', email: 'anna@example.com', coachId: 9, roleIds: [1] };
    editor.users = [{ id: 7, usernameOrName: 'Anna', email: 'anna@example.com', roles: ['ROLE_USER'], extraFields: { coach_id: 9 } }];
    editor.selectedCoach = editor.coaches[0];
    editor.roles = [{ id: 1, name: 'ROLE_USER' }];
    editor.selectedRoles = [...editor.roles];
    selector = TestBed.runInInjectionContext(() => new CoachSelectComponent({} as CoachNameIdService));
    selector.coaches = editor.coaches;
    selector.selectedCoachId = 9;
    selector.coachSelected.subscribe(coach => editor.onCoachSelected(coach));
  });
  afterEach(() => http.verify());

  it('propagates an empty selection and sends explicit coachId null in the save request', () => {
    const changed = jasmine.createSpy();
    selector.selectedCoachIdChange.subscribe(changed);
    selector.selectedCoachId = undefined;
    selector.onCoachChange();
    expect(changed).toHaveBeenCalledOnceWith(undefined);
    expect(editor.selectedCoach).toBeUndefined();
    expect(editor.selectedUser.coachId).toBeNull();
    editor.onSave();
    const request = http.expectOne(API_ENDPOINTS.members);
    expect(request.request.body.coachId).toBeNull();
    expect(request.request.body.id).toBe(7);
    expect(request.request.body.roleIds).toEqual([1]);
    request.flush({ success: true, data: null, message: null });
    editor.onUserSelected({ id: 7, username: 'Anna' });
    expect(editor.selectedUser.coachId).toBeNull();
    expect(editor.selectedCoach).toBeUndefined();
  });

  it('can assign a new coach after clearing the old one', () => {
    selector.selectedCoachId = undefined;
    selector.onCoachChange();
    selector.selectedCoachId = 10;
    selector.onCoachChange();
    editor.onSave();
    const request = http.expectOne(API_ENDPOINTS.members);
    expect(request.request.body.coachId).toBe(10);
    request.flush({ success: true, data: null, message: null });
  });

  it('preserves the existing coach if the selection was not changed', () => {
    editor.onSave();
    const request = http.expectOne(API_ENDPOINTS.members);
    expect(request.request.body.coachId).toBe(9);
    request.flush({ success: true, data: null, message: null });
  });
});
