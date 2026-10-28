import { NgClass } from '@angular/common';
import { Component, Input } from '@angular/core';

import { AppIconComponent, AppIconName } from '../app-icon/app-icon.component';

/**
 * Kártya zöld fejléce középen fehér körben egy ikonnal.
 * Az edzéstár, a gyakorlattár és a programlista kártyái is ezt használják,
 * hogy a fejlécek mindenhol egyformák legyenek.
 * Hoverkor az ikon kicsit nagyobb lesz; ehhez a szülő app-card-on `group` osztály kell.
 */
@Component({
  selector: 'app-card-banner',
  standalone: true,
  imports: [AppIconComponent, NgClass],
  host: { class: 'block' },
  template: `
    <div [ngClass]="variant === 'decorated'
      ? 'relative flex h-32 sm:h-44 items-center justify-center overflow-hidden bg-gradient-to-br from-primary-700 to-primary-800'
      : 'flex h-28 items-center justify-center bg-gradient-to-r from-primary-700 to-primary-800'">
      @if (variant === 'decorated') {
        <div class="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10"></div>
        <div class="absolute -bottom-12 -left-8 h-32 w-32 rounded-full bg-white/10"></div>
      }
      <span
        [ngClass]="variant === 'decorated'
          ? 'relative flex h-20 w-20 items-center justify-center rounded-2xl bg-white/95 text-5xl shadow-lg ring-1 ring-white/30 transition duration-200 group-hover:scale-105'
          : 'flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-md transition duration-200 group-hover:scale-105'"
        [attr.aria-hidden]="variant === 'compact' ? 'true' : null"
      >
        <app-icon [name]="icon" [sizeClass]="variant === 'decorated' ? 'h-8 w-8' : 'h-5 w-5'" />
      </span>
    </div>
  `,
})
export class AppCardBannerComponent {
  @Input() variant: 'compact' | 'decorated' = 'compact';
  @Input({ required: true }) icon!: AppIconName;
}
