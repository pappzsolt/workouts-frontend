import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-badge, span[appBadge]',
  standalone: true,
  host: { '[class]': 'classes' },
  template: '<ng-content />',
})
export class AppBadgeComponent {
  @Input() appBadge: '' | 'default' | 'counter' | 'tab' | 'step' | 'count' | 'plain' = 'default';
  @Input() tone: 'neutral' | 'primary' | 'info' | 'success' | 'danger' | null = null;
  get classes(): string {
    const variants = {
      counter:
        'inline-flex min-w-9 items-center justify-center rounded-full px-3 py-1 text-sm font-bold',
      tab: 'mt-1 inline-flex min-w-7 items-center justify-center rounded-full px-2 py-0.5 text-xs font-bold',
      step: 'rounded-full px-2.5 py-1 text-xs font-bold',
      count: 'rounded-full px-3 py-1 text-xs font-bold',
    };
    const base =
      this.appBadge in variants
        ? variants[this.appBadge as keyof typeof variants]
        : this.appBadge === 'plain'
          ? ''
          : 'inline-flex rounded-full border px-3 py-1 text-xs font-semibold';
    const tones = {
      neutral: 'border-surface-200 bg-surface-50 text-content-600',
      primary: 'border-primary-200 bg-primary-50 text-primary-700',
      info: 'border-info-200 bg-info-50 text-info-700',
      success: 'border-success-200 bg-success-50 text-success-700',
      danger: 'border-delete-200 bg-delete-50 text-delete-700',
    };
    return base + (this.tone ? ' ' + tones[this.tone] : '');
  }
}
