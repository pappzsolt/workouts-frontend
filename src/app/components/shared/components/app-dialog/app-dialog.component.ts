import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { A11yModule } from '@angular/cdk/a11y';

let nextDialogId = 0;

/** Layout only. Closing and saving remain explicit decisions of the consumer. */
@Component({
  selector: 'app-dialog',
  standalone: true,
  imports: [A11yModule],
  host: { style: 'display: contents' },
  template: ` <div
    [class]="backdropClass"
    (click)="onBackdrop($event)"
    role="dialog"
    aria-modal="true"
    [attr.aria-label]="ariaLabel || null"
    [attr.aria-labelledby]="labelledBy || null"
    [attr.aria-describedby]="describedBy || null"
  >
    <div
      [class]="panelClass"
      [cdkTrapFocus]="trapFocus"
      [cdkTrapFocusAutoCapture]="trapFocus"
      tabindex="-1"
    >
      <ng-content select="[dialogHeader]" />
      <ng-content />
      <ng-content select="[dialogActions]" />
    </div>
  </div>`,
})
export class AppDialogComponent {
  readonly titleId = `app-dialog-${++nextDialogId}-title`;
  @Input() backdropClass =
    'fixed inset-0 z-50 flex items-center justify-center bg-surface-900/50 p-4 backdrop-blur-sm';
  @Input() panelClass =
    'flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-surface-200 bg-white shadow-2xl';
  @Input() ariaLabel = '';
  @Input() labelledBy = '';
  @Input() describedBy = '';
  @Input() busy = false;
  @Input() trapFocus = false;
  @Input() closeOnEscape = false;
  @Input() closeOnBackdrop = false;
  @Output() readonly dismissed = new EventEmitter<void>();
  @HostListener('document:keydown.escape') onEscape(): void {
    if (this.closeOnEscape && !this.busy) this.dismissed.emit();
  }
  onBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget && this.closeOnBackdrop && !this.busy)
      this.dismissed.emit();
  }
}
