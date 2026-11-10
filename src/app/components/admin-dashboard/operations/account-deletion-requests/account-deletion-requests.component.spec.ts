import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { AccountDeletionRequestsComponent } from './account-deletion-requests.component';
import { AccountDeletionService, DeletionRequest } from '../../../../services/account-deletion/account-deletion.service';

describe('Manual deletion administration', () => {
  const row: DeletionRequest = { id: 1, email: 'a@example.com', message: null, status: 'PENDING', createdAt: '', resolvedAt: null, resolvedBy: null, resolutionNote: null };
  const service = { list: jasmine.createSpy(), resolve: jasmine.createSpy() };
  beforeEach(() => {
    service.list.and.returnValue(of({ content: [row], page: 0, totalPages: 1 }));
    service.resolve.calls.reset();
    TestBed.configureTestingModule({ providers: [{ provide: AccountDeletionService, useValue: service }] });
  });
  const create = () => TestBed.runInInjectionContext(() => new AccountDeletionRequestsComponent());
  it('requires a note and explicit confirmation before recording completion', () => {
    const c = create(); c.select(row); c.save();
    c.note = 'verified and deleted'; c.save();
    expect(service.resolve).not.toHaveBeenCalled();
    service.resolve.and.returnValue(of({ success: true })); c.confirmed = true; c.save();
    expect(service.resolve).toHaveBeenCalledOnceWith(1, 'COMPLETED', 'verified and deleted');
    expect(c.selected).toBeNull();
  });
  it('prevents concurrent resolutions and allows retry after failure', () => {
    const pending = new Subject<any>(); service.resolve.and.returnValue(pending);
    const c = create(); c.select(row); c.note = 'verified'; c.confirmed = true;
    c.save(); c.save(); expect(service.resolve).toHaveBeenCalledTimes(1);
    pending.error(new Error('conflict'));
    expect(c.saving).toBeFalse(); expect(c.selected?.id).toBe(1); expect(c.error).toBeTruthy();
  });
});
