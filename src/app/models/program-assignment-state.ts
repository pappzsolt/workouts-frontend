/** Existing assignments are retained; the existing API supports adding assignments. */
export class ProgramAssignmentState {
  assignedUserIds: number[] = [];
  selectedUserIds: number[] = [];

  private validate(ids: number[]): number[] {
    if (!Array.isArray(ids) || ids.some(id => !Number.isInteger(id) || id <= 0) ||
        new Set(ids).size !== ids.length) {
      throw new Error('Invalid program assignment data received.');
    }
    return [...ids];
  }

  loadAssigned(ids: number[]): void {
    this.assignedUserIds = this.validate(ids);
    this.selectedUserIds = [...new Set([...this.selectedUserIds, ...ids])];
  }

  select(ids: number[]): void {
    const selected = this.validate(ids);
    if (this.assignedUserIds.some(id => !selected.includes(id))) {
      throw new Error('Existing assignments cannot be removed by the assignment API.');
    }
    this.selectedUserIds = selected;
  }

  get pendingUserIds(): number[] {
    return this.selectedUserIds.filter(id => !this.assignedUserIds.includes(id));
  }

  markAssigned(id: number): void {
    this.loadAssigned([...this.assignedUserIds, id]);
  }
}
