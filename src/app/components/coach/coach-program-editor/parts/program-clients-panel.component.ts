import { Component, EventEmitter, Input, Output, model } from '@angular/core';

import { AppInputDirective } from '../../../shared/components/form-controls/app-input.directive';
import { AppCheckboxDirective } from '../../../shared/components/form-controls/app-check.directive';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { AppIconComponent } from '../../../shared/components/app-icon/app-icon.component';
import type { CoachClientOverview } from '../../../../models/coach-workspace.model';
import { clientInitials } from '../program-days';

/** A program ügyfelei: kiosztottak (visszavonással) és kiosztás további ügyfeleknek. */
@Component({
  selector: 'app-program-clients-panel',
  standalone: true,
  imports: [
    AppInputDirective,
    AppCheckboxDirective,
    CommonModule,
    RouterModule,
    FormsModule,
    TranslatePipe,
    AppIconComponent,
  ],
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
