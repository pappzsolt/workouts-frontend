import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

export type AppCardVariant = 'default' | 'outlined';

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app-card.component.html',
  styleUrl: './app-card.component.css',
})
export class AppCardComponent {
  @Input() variant: AppCardVariant = 'default';
}
