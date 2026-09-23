import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

export type PhosphorDuotoneIconName =
  | 'barbell'
  | 'book-open-text'
  | 'calendar-blank'
  | 'chart-bar'
  | 'chart-line-up'
  | 'fire'
  | 'link'
  | 'magnifying-glass'
  | 'pencil-simple'
  | 'user-plus'
  | 'users-three';

@Component({
  selector: 'app-phosphor-icon',
  standalone: true,
  imports: [CommonModule],
  template: `
    <i
      class="ph-duotone inline-block leading-none"
      [ngClass]="['ph-' + name, sizeClass]"
      aria-hidden="true"
    ></i>
  `,
  styles: [':host { display: inline-flex; flex: none; align-items: center; justify-content: center; line-height: 1; }'],
})
export class PhosphorIconComponent {
  @Input({ required: true }) name!: PhosphorDuotoneIconName;
  @Input() sizeClass = 'text-4xl';
}
