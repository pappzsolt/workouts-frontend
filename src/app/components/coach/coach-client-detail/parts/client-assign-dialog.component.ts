import { Component, EventEmitter, Input, Output } from '@angular/core';

import type { CoachProgram } from '../../../../models/coach-workspace.model';
import { SHARED_IMPORTS } from '../../../shared/shared-imports';

/** Program kiosztása az ügyfélnek: a még ki nem osztott programok közül egy választható. */
@Component({
  selector: 'app-client-assign-dialog',
  standalone: true,
  imports: [...SHARED_IMPORTS],
  templateUrl: './client-assign-dialog.component.html',
  host: { class: 'contents' },
})
export class ClientAssignDialogComponent {
  @Input() username: string | null | undefined = '';
  @Input() loading = false;
  @Input() programs: CoachProgram[] = [];
  @Input() assigning = false;
  @Input() selectedId: number | null = null;

  @Output() readonly selectedIdChange = new EventEmitter<number | null>();
  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly confirmed = new EventEmitter<void>();
}
