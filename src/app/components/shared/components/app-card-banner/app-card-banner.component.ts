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
  imports: [AppIconComponent],
  host: { class: 'block' },
  template: `
    <div class="flex h-28 items-center justify-center bg-gradient-to-r from-primary-700 to-primary-800">
      <span
        class="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-md transition duration-200 group-hover:scale-105"
        aria-hidden="true"
      >
        <app-icon [name]="icon" sizeClass="h-5 w-5" />
      </span>
    </div>
  `,
})
export class AppCardBannerComponent {
  @Input({ required: true }) icon!: AppIconName;
}
