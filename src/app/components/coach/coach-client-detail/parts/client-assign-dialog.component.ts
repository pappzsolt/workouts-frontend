import { Component, EventEmitter, Input, Output } from '@angular/core';

import type { CoachProgram } from '../../../../models/coach-workspace.model';
import { AppRadioDirective } from '../../../shared/components/form-controls/app-check.directive';
import { AppDialogComponent } from '../../../shared/components/app-dialog/app-dialog.component';
import { AppLoadingComponent } from '../../../shared/components/app-state/app-state.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

/** Program kiosztása az ügyfélnek: a még ki nem osztott programok közül egy választható. */
@Component({
  selector: 'app-client-assign-dialog',
  standalone: true,
  imports: [
    AppRadioDirective,
    AppDialogComponent,
    AppLoadingComponent,
    CommonModule,
    FormsModule,
    TranslatePipe,
  ],
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
