import { Component, EventEmitter, Input, Output, model } from '@angular/core';

import { SHARED_IMPORTS } from '../../../shared/shared-imports';
import type { CoachClientOverview } from '../../../../models/coach-workspace.model';

/** Program másolása új névvel, kezdőnappal, opcionálisan egy ügyfélnek. */
@Component({
  selector: 'app-program-copy-dialog',
  standalone: true,
  imports: [...SHARED_IMPORTS],
  templateUrl: './program-copy-dialog.component.html',
  host: { class: 'contents' },
})
export class ProgramCopyDialogComponent {
  @Input() clients: CoachClientOverview[] = [];
  @Input() busy = false;

  readonly copyName = model('');
  readonly copyStart = model('');
  readonly copyUserId = model<number | null>(null);

  @Output() readonly dismissed = new EventEmitter<void>();
  @Output() readonly confirmed = new EventEmitter<void>();
}
