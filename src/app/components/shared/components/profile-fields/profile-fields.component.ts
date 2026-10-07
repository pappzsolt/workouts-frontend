import { Component, Input } from '@angular/core';

/** Common layout; native fields, DTOs, validators and submit handlers stay in each page. */
@Component({
  selector: 'form[appProfileFields], div[appProfileFields]',
  standalone: true,
  host: { '[class]': 'classes' },
  template: '<ng-content />',
})
export class ProfileFieldsComponent {
  @Input() appProfileFields: '' | 'default' | 'compact' = 'default';
  get classes(): string {
    return (
      'grid min-w-0 grid-cols-1 sm:grid-cols-2 ' +
      (this.appProfileFields === 'compact' ? 'gap-4' : 'gap-5')
    );
  }
}
