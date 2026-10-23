import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { RegistrationRequestsService } from './registration-requests.service';
import { API_ENDPOINTS } from '../../api-endpoints';

describe('Registration decision response handling', () => {
  let service: RegistrationRequestsService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(RegistrationRequestsService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  for (const action of ['approve', 'reject'] as const) {
    const endpoint = () => action === 'approve' ? API_ENDPOINTS.adminRegistrationApprove(7) : API_ENDPOINTS.adminRegistrationReject(7);
    const success = action === 'approve' ? 'adminRegistrations.approved' : 'adminRegistrations.rejected';
    const failure = `adminRegistrations.errors.${action}`;
    it(`reports an unsuccessful ${action} response as an error, preserving backend text`, () => {
      const next = jasmine.createSpy();
      const error = jasmine.createSpy();
      service[action](7, null).subscribe({ next, error });
      http.expectOne(endpoint()).flush({ success: false, data: null, message: 'Decision refused' });
      expect(next).not.toHaveBeenCalled();
      expect(error.calls.mostRecent().args[0].message).toBe('Decision refused');
    });
    it(`uses an error translation key when ${action} fails without a message`, () => {
      const error = jasmine.createSpy();
      service[action](7, null).subscribe({ next: () => fail('unexpected success'), error });
      http.expectOne(endpoint()).flush({ success: false, data: null, message: ' ' });
      expect(error.calls.mostRecent().args[0].message).toBe(failure);
    });
    it(`accepts successful ${action} responses with null data`, () => {
      const next = jasmine.createSpy();
      service[action](7, null).subscribe({ next, error: fail });
      http.expectOne(endpoint()).flush({ success: true, data: null, message: null });
      expect(next).toHaveBeenCalledOnceWith(success);
    });
    it(`preserves a successful ${action} backend message`, () => {
      const next = jasmine.createSpy();
      service[action](7, null).subscribe({ next, error: fail });
      http.expectOne(endpoint()).flush({ success: true, data: null, message: 'Decision saved' });
      expect(next).toHaveBeenCalledOnceWith('Decision saved');
    });
  }
});
