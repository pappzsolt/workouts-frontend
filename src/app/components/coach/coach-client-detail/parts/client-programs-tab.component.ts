import { Component, EventEmitter, Input, Output } from '@angular/core';

import type { CoachClientProgram } from '../../../../models/coach-workspace.model';
import { SHARED_IMPORTS } from '../../../shared/shared-imports';
import { percent } from '../../coach-ui';
import { programState } from '../client-plan';

/** Az ügyfél programjai: állapot, előrehaladás, visszavonás és az edzésterv megnyitása. */
@Component({
  selector: 'app-client-programs-tab',
  standalone: true,
  imports: [...SHARED_IMPORTS],
  templateUrl: './client-programs-tab.component.html',
  host: { class: 'contents' },
})
export class ClientProgramsTabComponent {
  @Input({ required: true }) programs: CoachClientProgram[] = [];
  @Input() revokeProgramId: number | null = null;
  @Input({ required: true }) today = '';

  @Output() readonly askRevoke = new EventEmitter<number>();
  @Output() readonly cancelRevoke = new EventEmitter<void>();
  @Output() readonly confirmRevoke = new EventEmitter<void>();
  @Output() readonly openPlan = new EventEmitter<number>();

  readonly percent = percent;

  state(program: CoachClientProgram) {
    return programState(program, this.today);
  }
}
