import { AppButtonComponent } from '../app-button/app-button.component';
import {
  Component,
  EventEmitter,
  HostListener,
  Input,
  Output,
  OnDestroy,
  inject,
} from '@angular/core';
import { A11yModule } from '@angular/cdk/a11y';
import { DOCUMENT } from '@angular/common';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { MessageComponent } from '../message/message.component';

let nextDialogId = 0;

/** Újrahasználható megerősítés; a tájékoztató szöveget a MessageComponent jeleníti meg. */
@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [A11yModule, AppButtonComponent, CommonModule, TranslatePipe, MessageComponent],
  templateUrl: './confirm-dialog.component.html',
  styleUrls: ['./confirm-dialog.component.css'],
})
export class ConfirmDialogComponent implements OnDestroy {
  private readonly document = inject(DOCUMENT);
  private previousFocus: HTMLElement | null = null;
  private opened = false;
  readonly titleId = `confirm-${++nextDialogId}-title`;
  readonly descriptionId = `${this.titleId}-description`;
  @Input() title = 'userWorkoutExerciseManager.deleteConfirmTitle';
  @Input() get open(): boolean {
    return this.opened;
  }
  set open(value: boolean) {
    if (value && !this.opened) this.previousFocus = this.document.activeElement as HTMLElement;
    if (!value && this.opened) this.restoreFocus();
    this.opened = value;
  }
  private restoreFocus(): void {
    if (this.previousFocus?.isConnected) this.previousFocus.focus();
    this.previousFocus = null;
  }
  ngOnDestroy(): void {
    this.restoreFocus();
  }
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
