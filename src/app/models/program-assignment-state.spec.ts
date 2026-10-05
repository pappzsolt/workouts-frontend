import { ProgramAssignmentState } from './program-assignment-state';

describe('ProgramAssignmentState', () => {
  it('retains every loaded user and assigns only newly selected users', () => {
    const state = new ProgramAssignmentState();
    state.loadAssigned([11, 22]);
    expect(state.selectedUserIds).toEqual([11, 22]);
    state.select([11, 22, 33, 44]);
    expect(state.pendingUserIds).toEqual([33, 44]);
    state.markAssigned(33);
    // If the next HTTP call fails, retry must not reschedule user 33.
    expect(state.pendingUserIds).toEqual([44]);
    expect(() => state.select([22, 33, 44])).toThrowError();
  });

  it('supports multiple new users without mutating the input arrays', () => {
    const state = new ProgramAssignmentState();
    const selected = [11, 22];
    state.select(selected);
    selected.push(33);
    expect(state.pendingUserIds).toEqual([11, 22]);
    state.markAssigned(11);
    state.markAssigned(22);
    expect(state.pendingUserIds).toEqual([]);
    state.loadAssigned([11, 22]);
    expect(state.selectedUserIds).toEqual([11, 22]);
  });

  it('rejects malformed assignment data', () => {
    const state = new ProgramAssignmentState();
    expect(() => state.loadAssigned([0])).toThrowError();
    expect(() => state.loadAssigned([11, 11])).toThrowError();
    expect(() => state.select([1.5])).toThrowError();
  });
});
