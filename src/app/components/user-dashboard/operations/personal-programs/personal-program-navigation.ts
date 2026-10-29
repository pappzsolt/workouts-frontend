import { Observable, Subject } from 'rxjs';
import type { PersonalProgramState } from './personal-program-state';

/** Pending route-leave confirmation and browser-unload protection. */
export class PersonalProgramNavigation {
  constructor(private readonly state: PersonalProgramState) {}

  destroy(): void {
    this.leaveResult?.next(false);
    this.leaveResult?.complete();
  }

  private leaveResult?: Subject<boolean>;

  cancel(): void {
    if (this.state.busy) return;
    if (this.state.action === 'leave') this.finishLeave(false);
    else this.state.action = null;
  }

  canLeave(): boolean | Observable<boolean> {
    if (this.state.busy) return false;
    if (!this.state.dirty) return true;
    this.state.action = 'leave';
    this.leaveResult ??= new Subject<boolean>();
    return this.leaveResult.asObservable();
  }

  finishLeave(result: boolean): void {
    this.state.action = null;
    this.leaveResult?.next(result);
    this.leaveResult?.complete();
    this.leaveResult = undefined;
  }

  beforeUnload(event: BeforeUnloadEvent): void {
    if (this.state.dirty || this.state.busy) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
}
