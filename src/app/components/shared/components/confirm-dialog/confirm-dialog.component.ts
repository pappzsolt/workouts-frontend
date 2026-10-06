import { AppButtonComponent } from '../app-button/app-button.component';
import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { MessageComponent } from '../message/message.component';

/** Újrahasználható megerősítés; a tájékoztató szöveget a MessageComponent jeleníti meg. */
@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [AppButtonComponent, CommonModule, TranslatePipe, MessageComponent],
  templateUrl: './confirm-dialog.component.html',
  styleUrls: ['./confirm-dialog.component.css'],
})
export class ConfirmDialogComponent {
  @Input() open = false;
  @Input() busy = false;
  @Input() message = '';
  @Input() messageParams: Record<string, unknown> = {};
  @Input() confirmLabel = 'userWorkoutExerciseManager.delete';
  @Input() cancelLabel = 'userWorkoutExerciseManager.cancel';
  @Output() readonly confirmed = new EventEmitter<void>();
  @Output() readonly cancelled = new EventEmitter<void>();

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open && !this.busy) this.cancelled.emit();
  }
}
