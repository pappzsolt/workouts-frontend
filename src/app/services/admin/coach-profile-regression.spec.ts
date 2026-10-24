import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Subject } from 'rxjs';
import { CoachEditService } from './coach-edit.service';
import { CoachProfileComponent } from '../../components/coach-dashboard/operations/coach-profile/coach-profile.component';
import { CoachProfileService } from '../coach/coach-profile.service';
import { AuthService } from '../auth/auth.service';
import { LoggerService } from '../logger.service';
import { API_ENDPOINTS } from '../../api-endpoints';
import type { ApiResponse } from '../../models/backend-dto/common/api-response';

describe('Coach role preservation and profile save regressions', () => {
  it('leaves coach roles unchanged during a name-only admin edit', () => {
    TestBed.configureTestingModule({providers: [provideHttpClient(), provideHttpClientTesting()]});
    const http = TestBed.inject(HttpTestingController);
    const service = TestBed.inject(CoachEditService);
    service.getCoaches().subscribe(coaches => service.updateCoach(coaches[0].id, {...coaches[0], name: 'New name'}).subscribe());
    http.expectOne(API_ENDPOINTS.members).flush({success: true, data: [{id: 7, type: 'coach', usernameOrName: 'Old name', email: 'coach@example.com', roles: ['ROLE_ADMIN'], extraFields: {phone: '123'}}]});
    const save = http.expectOne(API_ENDPOINTS.members);
    expect(save.request.body.roleIds).toBeNull();
    save.flush({success: true, data: null});
    http.verify();
  });

  function create() {
    const responses: Subject<ApiResponse<void>>[] = [];
    const save = jasmine.createSpy('saveCoachProfile').and.callFake(() => {
      const response = new Subject<ApiResponse<void>>(); responses.push(response); return response;
    });
    TestBed.configureTestingModule({providers: [
      {provide: CoachProfileService, useValue: {saveCoachProfile: save}},
      {provide: AuthService, useValue: {}},
      {provide: LoggerService, useValue: {error: () => {}}},
    ]});
    const component = TestBed.runInInjectionContext(() => new CoachProfileComponent());
    component.profile = {...component.profile, id: 7, name: 'Coach', email: 'coach@example.com'};
    return {component, responses, save};
  }

  it('blocks a password change without a current password', () => {
    const {component, responses, save} = create();
    component.profile.password_hash = 'FirstPassword123';
    for (const currentPassword of ['', '   ']) {
      component.currentPassword = currentPassword;
      component.saveProfile();
      expect(save).not.toHaveBeenCalled();
      expect(responses.length).toBe(0);
      expect(component.saving).toBeFalse();
      expect(component.messageType).toBe('error');
      expect(component.profile.password_hash).toBe('FirstPassword123');
    }
  });

  it('preserves a newer unsaved password when an earlier save finishes', () => {
    const {component, responses, save} = create();
    component.profile.password_hash = 'FirstPassword123';
    component.currentPassword = 'CurrentPassword123';
    component.saveProfile();
    component.profile.password_hash = 'SecondPassword456';
    responses[0].next({success: true, data: null, message: null});
    expect(save.calls.first().args[0].passwordHash).toBe('FirstPassword123');
    expect(save.calls.first().args[0].currentPassword).toBe('CurrentPassword123');
    expect(component.profile.password_hash).toBe('SecondPassword456');
  });

  it('blocks overlapping saves and allows another save after completion', () => {
    const {component, responses, save} = create();
    component.profile.phone = '111';
    component.saveProfile();
    expect(component.saving).toBeTrue();
    component.profile.phone = '222';
    component.saveProfile();
    expect(save.calls.count()).toBe(1);
    expect(save.calls.argsFor(0)[0].phone).toBe('111');
    responses[0].next({success: true, data: null, message: null});
    responses[0].complete();
    expect(component.saving).toBeFalse();
    component.saveProfile();
    expect(save.calls.count()).toBe(2);
    expect(save.calls.argsFor(1)[0].phone).toBe('222');
  });

  it('clears the submitted password after successful save when it is unchanged', () => {
    const {component, responses} = create();
    component.profile.password_hash = 'FirstPassword123';
    component.currentPassword = 'CurrentPassword123';
    component.saveProfile();
    responses[0].next({success: true, data: null, message: null});
    responses[0].complete();
    expect(component.profile.password_hash).toBe('');
    expect(component.currentPassword).toBe('');
    expect(component.messageType).toBe('success');
    expect(component.saving).toBeFalse();
  });

  it('retains password and permits retry after a network failure', () => {
    const {component, responses, save} = create();
    component.profile.password_hash = 'FirstPassword123';
    component.currentPassword = 'CurrentPassword123';
    component.saveProfile();
    responses[0].error({status: 0});
    expect(component.saving).toBeFalse();
    expect(component.profile.password_hash).toBe('FirstPassword123');
    expect(component.currentPassword).toBe('CurrentPassword123');
    expect(component.messageType).toBe('error');
    component.saveProfile();
    expect(save.calls.count()).toBe(2);
  });

  it('retains password and permits retry after an unsuccessful response', () => {
    const {component, responses, save} = create();
    component.profile.password_hash = 'FirstPassword123';
    component.currentPassword = 'CurrentPassword123';
    component.saveProfile();
    responses[0].next({success: false, data: null, message: 'Rejected'});
    responses[0].complete();
    expect(component.saving).toBeFalse();
    expect(component.profile.password_hash).toBe('FirstPassword123');
    expect(component.currentPassword).toBe('CurrentPassword123');
    expect(component.messageType).toBe('error');
    component.saveProfile();
    expect(save.calls.count()).toBe(2);
  });
});
