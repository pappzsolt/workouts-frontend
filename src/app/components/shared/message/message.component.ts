import { Component, Input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-message',
  standalone: true,
  imports: [TranslatePipe],
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
        return 'border-green-200 bg-green-50 text-green-700';

      case 'error':
        return 'border-red-200 bg-red-50 text-red-700';

      case 'info':
        return 'border-blue-200 bg-blue-50 text-blue-700';

      default:
        return 'border-gray-200 bg-gray-50 text-gray-700';
    }
  }
}
