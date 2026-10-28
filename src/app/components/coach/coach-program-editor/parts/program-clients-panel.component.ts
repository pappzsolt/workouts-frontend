import { Component, EventEmitter, Input, Output, model } from '@angular/core';

import { SHARED_IMPORTS } from '../../../shared/shared-imports';
import type { CoachClientOverview } from '../../../../models/coach-workspace.model';
import { clientInitials } from '../program-days';

/** A program ügyfelei: kiosztottak (visszavonással) és kiosztás további ügyfeleknek. */
@Component({
  selector: 'app-program-clients-panel',
  standalone: true,
  imports: [...SHARED_IMPORTS],
  templateUrl: './program-clients-panel.component.html',
  host: { class: 'contents' },
})
export class ProgramClientsPanelComponent {
  @Input() assignedClients: CoachClientOverview[] = [];
  @Input() unassignedClients: CoachClientOverview[] = [];
  @Input() visibleClients: CoachClientOverview[] = [];
  @Input() toAssign: ReadonlySet<number> = new Set();
  @Input() busy = false;

  readonly clientFilter = model('');

  @Output() readonly askRevoke = new EventEmitter<CoachClientOverview>();
  @Output() readonly selectVisible = new EventEmitter<void>();
  @Output() readonly clearSelection = new EventEmitter<void>();
  @Output() readonly toggleAssign = new EventEmitter<{ userId: number; checked: boolean }>();
  @Output() readonly assignSelected = new EventEmitter<void>();

  initials(client: CoachClientOverview): string {
    return clientInitials(client);
  }
}
