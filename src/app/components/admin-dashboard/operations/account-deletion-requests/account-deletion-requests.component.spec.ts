import { TestBed } from '@angular/core/testing';
import { Subject, of } from 'rxjs';
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
  for (const initial of ['REJECTED', 'COMPLETED'] as const) {
    it(`requires fresh confirmation after changing a confirmed ${initial} outcome`, () => {
      const c = create();
      c.select(row);
      c.decision = initial;
      c.note = 'Verified outcome';
      c.confirmed = true;
      const next = initial === 'REJECTED' ? 'COMPLETED' : 'REJECTED';
      c.decision = next;
      expect(c.confirmed).toBeFalse();
      c.save();
      expect(service.resolve).not.toHaveBeenCalled();
      service.resolve.and.returnValue(of({ success: true }));
      c.confirmed = true;
      c.save();
      expect(service.resolve).toHaveBeenCalledOnceWith(1, next, 'Verified outcome');
    });
  }

  it('rejects an invalid outcome even when the form handler is called directly', () => {
    const c = create();
    c.select(row);
    c.decision = '' as typeof c.decision;
    c.note = 'Verified outcome';
    c.confirmed = true;
    expect(c.canSave).toBeFalse();
    c.save();
    expect(service.resolve).not.toHaveBeenCalled();
  });

  it('prevents decisions on retained rows until the current list request finishes', () => {
    const c = create();
    c.select(row);
    c.note = 'verified';
    c.confirmed = true;
    const refresh = new Subject<{ content: DeletionRequest[]; page: number; totalPages: number }>();
    service.list.and.returnValue(refresh);

    c.load(0);
    c.save();
    expect(service.resolve).not.toHaveBeenCalled();

    refresh.next({ content: [row], page: 0, totalPages: 1 });
    refresh.complete();
    service.resolve.and.returnValue(of({ success: true }));
    service.list.and.returnValue(of({ content: [{ ...row, status: 'COMPLETED' }], page: 0, totalPages: 1 }));
    c.save();
    expect(service.resolve).toHaveBeenCalledOnceWith(1, 'COMPLETED', 'verified');
    expect(c.rows[0].status).toBe('COMPLETED');
  });

  it('prevents concurrent resolutions and allows retry after failure', () => {
    const pending = new Subject<any>(); service.resolve.and.returnValue(pending);
    const c = create(); c.select(row); c.note = 'verified'; c.confirmed = true;
    c.save(); c.save(); expect(service.resolve).toHaveBeenCalledTimes(1);
    pending.error(new Error('conflict'));
    expect(c.saving).toBeFalse(); expect(c.selected?.id).toBe(1); expect(c.error).toBeTruthy();
  });
});
