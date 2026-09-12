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
}
