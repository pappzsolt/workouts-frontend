import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-message',
  standalone: true,
  templateUrl: './message.component.html',
  styleUrls: ['./message.component.css'],
})
export class MessageComponent {
  @Input()
  message = '';

  @Input()
  type: 'success' | 'error' | 'info' | '' = '';

  get messageClasses(): string {
    switch (this.type) {
      case 'success':
        return 'border-success-200 bg-success-50 text-success-700';

      case 'error':
        return 'border-delete-200 bg-delete-50 text-delete-700';

      case 'info':
        return 'border-info-200 bg-info-50 text-info-700';

      default:
        return 'border-surface-200 bg-surface-50 text-content-700';
    }
  }
}
