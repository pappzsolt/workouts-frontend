import { Component, EventEmitter, Input, Output, model } from '@angular/core';

import { AppFormValidationDirective } from '../../../shared/components/form-controls/app-form-validation.directive';
import { AppInputDirective } from '../../../shared/components/form-controls/app-input.directive';
import { AppDialogComponent } from '../../../shared/components/app-dialog/app-dialog.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import type { CoachClientOverview } from '../../../../models/coach-workspace.model';

/** Program másolása új névvel, kezdőnappal, opcionálisan egy ügyfélnek. */
@Component({
  selector: 'app-program-copy-dialog',
  standalone: true,
  imports: [
    AppFormValidationDirective,
    AppInputDirective,
    AppDialogComponent,
    CommonModule,
    FormsModule,
    TranslatePipe,
  ],
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
