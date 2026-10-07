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
  @Input() padding: 'none' | 'sm' | 'md' | 'lg' = 'none';
  @Input() hover: boolean | null = null;
  @Input() overflow: 'hidden' | 'visible' | 'auto' = 'hidden';
  @Input() showHeader = false;
  @Input() showActions = false;

  get paddingClass(): string {
    return { none: '', sm: 'p-3', md: 'p-5', lg: 'p-6' }[this.padding];
  }
  get interactive(): boolean {
    return this.hover ?? this.variant === 'default';
  }

  @Input() variant: AppCardVariant = 'default';
}
