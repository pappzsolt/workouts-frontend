import { Component, Input } from '@angular/core';
import { MessageComponent } from '../message/message.component';

@Component({
  selector: 'app-loading, div[appLoading]',
  standalone: true,
  imports: [MessageComponent],
  host: { role: 'status', 'aria-live': 'polite' },
  template:
    '@if (message) { <app-message [message]="message" type="info" [messageParams]="messageParams" /> } <ng-content />',
})
export class AppLoadingComponent {
  @Input() message = '';
  @Input() messageParams: Record<string, unknown> = {};
}
@Component({
  selector: 'app-empty-state, div[appEmptyState]',
  standalone: true,
  imports: [MessageComponent],
  template:
    '@if (message) { <app-message [message]="message" type="info" [messageParams]="messageParams" /> } <ng-content />',
})
export class AppEmptyStateComponent {
  @Input() message = '';
  @Input() messageParams: Record<string, unknown> = {};
}
