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
}
