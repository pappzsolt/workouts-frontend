import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterLink, Params } from '@angular/router';

export type AppCardVariant = 'default' | 'outlined';

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './app-card.component.html',
  styleUrl: './app-card.component.css',
})
export class AppCardComponent {
  @Input() routerLink: string | any[] | null = null;
  @Input() queryParams: Params | null = null;
  @Input() variant: AppCardVariant = 'default';
}
