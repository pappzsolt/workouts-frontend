import { DestroyRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Observable, Subject, of, throwError } from 'rxjs';
import { ProgramOperationRunner } from './program-operation-runner';
import { ProgramEditorState } from './program-editor-state';

describe('Program operation request lifecycle', () => {
  let state: ProgramEditorState;
  let runner: ProgramOperationRunner;
  let success: jasmine.Spy;
  let failure: jasmine.Spy;
  beforeEach(() => {
    TestBed.configureTestingModule({});
    state = new ProgramEditorState();
    runner = new ProgramOperationRunner(state, TestBed.inject(DestroyRef));
    success = jasmine.createSpy('success'); failure = jasmine.createSpy('failure');
  });
  it('does not subscribe to a second write while another operation is pending', () => {
    const pending = new Subject<void>();
    runner.run(pending, {success, failure});
    const subscribe = jasmine.createSpy('subscribe');
    runner.run(new Observable(subscribe), {success, failure});
    expect(subscribe).not.toHaveBeenCalled();
    expect(state.busy).toBeTrue();
    pending.complete(); expect(success).toHaveBeenCalledTimes(1);
    expect(state.busy).toBeFalse();
  });
  it('hands failures to their own recovery policy with the editor unlocked', () => {
    const error = new Error('Rejected');
    failure.and.callFake(() => expect(state.busy).toBeFalse());
    runner.run(throwError(() => error), {success, failure});
    expect(failure).toHaveBeenCalledOnceWith(error);
    expect(success).not.toHaveBeenCalled();
  });
  it('cancels on destruction without reporting a successful save', () => {
    const pending = new Subject<void>();
    runner.run(pending, {success, failure});
    TestBed.resetTestingModule();
    expect(state.busy).toBeFalse();
    expect(success).not.toHaveBeenCalled();
    expect(failure).not.toHaveBeenCalled();
  });
  it('does not unlock a new operation started by a success policy', () => {
    const next = new Subject<void>();
    runner.run(of(undefined), {success: () => runner.run(next, {success, failure}), failure});
    expect(state.busy).toBeTrue();
    next.complete(); expect(state.busy).toBeFalse();
  });
});
