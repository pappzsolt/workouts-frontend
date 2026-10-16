import { Component, Input } from '@angular/core';

/**
 * Kis adatcsempe a kártyákon: felül a felirat, alatta az érték.
 * Ha az érték üres, gondolatjel jelenik meg, így nem marad egy magában álló mértékegység.
 */
@Component({
  selector: 'app-card-stat',
  standalone: true,
  host: { class: 'block rounded-lg bg-surface-50 px-3 py-2.5' },
  template: `
    <span class="block text-xs font-medium text-content-500">{{ label }}</span>
    <span class="mt-1 block text-sm font-semibold text-content-800">{{ display }}</span>
  `,
})
export class AppCardStatComponent {
  @Input() label = '';
  @Input() value: string | number | null | undefined = null;
  @Input() unit = '';

  get display(): string {
    if (this.value === null || this.value === undefined || this.value === '') return '–';
    return this.unit ? `${this.value} ${this.unit}` : String(this.value);
  }
}
