import { TestBed } from '@angular/core/testing';
import { Subject, of } from 'rxjs';
import type { PageResponse } from '../../../../models/backend-dto/common/page-response';
import type { RegistrationRequestDto, RegistrationStatus } from '../../../../models/backend-dto/registration/registration';
import { RegistrationRequestsService } from '../../../../services/admin/registration-requests.service';
import { UserEditService } from '../../../../services/admin/user-edit.service';
import { RegistrationRequestsComponent } from './registration-requests.component';

type RequestPage = PageResponse<RegistrationRequestDto>;
const page = (status: RegistrationStatus, pageNumber = 0): RequestPage => ({
  content: [{ id: 1, status } as RegistrationRequestDto], page: pageNumber, size: 10, totalElements: 30, totalPages: 3,
});

describe('Registration list request ordering', () => {
  let component: RegistrationRequestsComponent;
  let requests: Subject<RequestPage>[];
  let list: jasmine.Spy;
  beforeEach(() => {
    requests = [];
    list = jasmine.createSpy().and.callFake(() => {
      const request = new Subject<RequestPage>();
      requests.push(request);
      return request;
    });
    TestBed.configureTestingModule({ providers: [
      { provide: RegistrationRequestsService, useValue: { list } },
      { provide: UserEditService, useValue: { getCoaches: () => of([]) } },
    ] });
    component = TestBed.runInInjectionContext(() => new RegistrationRequestsComponent());
  });

  it('never displays an old tab response or its counts under the new tab', () => {
    component.selectTab('APPROVED');
    requests[1].next(page('APPROVED'));
    requests[0].next({ ...page('PENDING'), totalElements: 99 });
    expect(component.status).toBe('APPROVED');
    expect(component.requests[0].status).toBe('APPROVED');
    expect(component.totalElements).toBe(30);
  });

  it('clears previous rows, counts and rejection UI while switching tabs', () => {
    requests[0].next(page('PENDING'));
    component.startReject(component.requests[0]);
    component.rejectReason = 'Old draft';
    component.selectTab('REJECTED');
    expect(component.requests).toEqual([]);
    expect(component.totalElements).toBe(0);
    expect(component.totalPages).toBe(0);
    expect(component.rejectingId).toBeNull();
    expect(component.rejectReason).toBe('');
    expect(component.loading).toBeTrue();
  });

  it('ignores cancelled errors without interrupting the latest load', () => {
    component.selectTab('APPROVED');
    requests[0].error(new Error('old failure'));
    expect(component.loading).toBeTrue();
    expect(component.message).toBe('');
    requests[1].next(page('APPROVED'));
    expect(component.loading).toBeFalse();
  });

  it('keeps the latest page when responses arrive out of order', () => {
    component.onPageChange(2);
    component.onPageChange(3);
    requests[2].next(page('PENDING', 2));
    requests[1].next(page('PENDING', 1));
    expect(component.currentPage).toBe(3);
    expect(component.loading).toBeFalse();
  });

  it('keeps the latest page size when an earlier request finishes later', () => {
    component.onPageSizeChange(50);
    requests[1].next({ ...page('PENDING'), size: 50, totalPages: 1 });
    requests[0].next(page('PENDING'));
    expect(list).toHaveBeenCalledWith('PENDING', 0, 50);
    expect(component.pageSize).toBe(50);
    expect(component.totalPages).toBe(1);
  });

  it('allows loading again after the current request fails', () => {
    requests[0].error(new Error('offline'));
    expect(component.loading).toBeFalse();
    component.selectTab('APPROVED');
    requests[1].next(page('APPROVED'));
    expect(component.loading).toBeFalse();
    expect(component.requests[0].status).toBe('APPROVED');
  });
});
