import { TestBed } from '@angular/core/testing';
import { Subject, of } from 'rxjs';
import { UserDeletionDialogComponent } from './user-deletion-dialog.component';
import { AdminUserDeletionService, UserDeletionPreview } from '../../../services/account-deletion/admin-user-deletion.service';

const preview: UserDeletionPreview = { userId: 21, accountUuid: 'uuid', username: 'user', email: 'user@example.com', deletable: true,
  affectedData: { workouts: 2, personalPrograms: 1, programAssignments: 2, templates: 1, reports: 0 } };
describe('User deletion confirmation', () => {
  const service = { preview: jasmine.createSpy(), delete: jasmine.createSpy() };
  beforeEach(() => {
    service.preview.and.returnValue(of(preview)); service.delete.calls.reset();
    TestBed.configureTestingModule({ providers: [{ provide: AdminUserDeletionService, useValue: service }] });
  });
  function create() {
    const c = TestBed.runInInjectionContext(() => new UserDeletionDialogComponent());
    c.lookup = { userId: 21 }; c.ngOnInit(); return c;
  }
  it('requires the exact email and verification and protects ADMIN accounts', () => {
    const c = create(); c.submit();
    c.email = 'wrong@example.com'; c.verified = true; c.submit();
    c.email = preview.email; c.verified = false; c.submit();
    expect(service.delete).not.toHaveBeenCalled();
    c.preview = { ...preview, deletable: false }; c.verified = true; c.submit();
    expect(service.delete).not.toHaveBeenCalled();
  });
  it('sends the selected request ID and blocks duplicate submissions', () => {
    const pending = new Subject<number>(); service.delete.and.returnValue(pending);
    const c = create(); c.email = preview.email; c.verified = true; c.deletionRequestId = 42;
    const deleted = jasmine.createSpy(); c.deleted.subscribe(deleted);
    c.submit(); c.submit();
    expect(service.delete).toHaveBeenCalledOnceWith(preview, preview.email, 42);
    expect(deleted).not.toHaveBeenCalled();
    pending.next(21); pending.complete(); expect(deleted).toHaveBeenCalledOnceWith(21);
  });
  it('keeps the dialog open and requires verification again after a failure', () => {
    const pending = new Subject<number>(); service.delete.and.returnValue(pending);
    const c = create(); c.email = preview.email; c.verified = true;
    const closed = jasmine.createSpy(); c.closed.subscribe(closed);
    c.submit(); pending.error(new Error('conflict'));
    expect(c.saving).toBeFalse(); expect(c.verified).toBeFalse(); expect(c.error).toBeTruthy(); expect(closed).not.toHaveBeenCalled();
  });
});
