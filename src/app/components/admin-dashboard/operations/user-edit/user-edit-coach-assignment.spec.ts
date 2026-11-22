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
    editor.onUserSelected({ id: 7, username: 'Anna' });
    selector = TestBed.runInInjectionContext(() => new CoachSelectComponent({} as CoachNameIdService));
    selector.coaches = editor.coaches;
    selector.selectedCoachId = 9;
    selector.coachSelected.subscribe(coach => editor.onCoachSelected(coach));
  });
  afterEach(() => http.verify());

  function freshUser(coachId = 9, roles = ['ROLE_USER']): void {
    http.expectOne(API_ENDPOINTS.memberUserById(7)).flush({
      success: true,
      data: { id: 7, usernameOrName: 'Anna', email: 'anna@example.com', roles, extraFields: { coach_id: coachId } },
    });
  }

  it('propagates an empty selection and sends explicit coachId null in the save request', () => {
    const changed = jasmine.createSpy();
    selector.selectedCoachIdChange.subscribe(changed);
    selector.selectedCoachId = undefined;
    selector.onCoachChange();
    expect(changed).toHaveBeenCalledOnceWith(undefined);
    expect(editor.selectedCoach).toBeUndefined();
    expect(editor.selectedUser.coachId).toBeNull();
    editor.onSave();
    freshUser();
    const request = http.expectOne(API_ENDPOINTS.members);
    expect(request.request.body.coachId).toBeNull();
    expect(request.request.body.id).toBe(7);
    expect(request.request.body.roleIds).toBeUndefined();
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
    freshUser();
    const request = http.expectOne(API_ENDPOINTS.members);
    expect(request.request.body.coachId).toBe(10);
    request.flush({ success: true, data: null, message: null });
  });

  it('preserves the existing coach if the selection was not changed', () => {
    editor.onSave();
    freshUser();
    const request = http.expectOne(API_ENDPOINTS.members);
    expect(request.request.body.coachId).toBe(9);
    request.flush({ success: true, data: null, message: null });
  });

  it('preserves a newer assignment and role when saving a different field', () => {
    editor.selectedUser.goals = 'New goal';
    editor.onSave();
    freshUser(10, ['ROLE_ADMIN']);
    const request = http.expectOne(API_ENDPOINTS.members);
    expect(request.request.body).toEqual(jasmine.objectContaining({ id: 7, coachId: 10, goals: 'New goal' }));
    expect(request.request.body.roleIds).toBeUndefined();
    request.flush({ success: true });
  });

  it('blocks a conflicting assignment change and retains the draft', () => {
    editor.onCoachSelected(null);
    editor.onSave();
    freshUser(10);
    http.expectNone(API_ENDPOINTS.members);
    expect(editor.message).toBe('adminUserEdit.conflict');
    expect(editor.selectedUser.coachId).toBeNull();
  });

  it('replaces the role in a single-role update', () => {
    const admin = { id: 2, name: 'ROLE_ADMIN' };
    editor.roles.push(admin);
    editor.onRoleSelected(admin);
    editor.onSave();
    freshUser();
    const request = http.expectOne(API_ENDPOINTS.members);
    expect(request.request.body.roleIds).toEqual([2]);
    request.flush({ success: true });
  });

  it('cannot save the previous user while an unknown picker selection is loading', () => {
    editor.onUserSelected({ id: 8, username: 'Bela' });
    const load = http.expectOne(API_ENDPOINTS.memberUserById(8));
    editor.onSave();
    http.expectNone(API_ENDPOINTS.memberUserById(7));
    http.expectNone(API_ENDPOINTS.members);
    load.flush({ success: true, data: { id: 8, usernameOrName: 'Bela', email: 'bela@example.com', roles: [] } });
    expect(editor.hasSelectedSnapshot).toBeTrue();
    expect(editor.selectedUser.id).toBe(8);
  });

});
