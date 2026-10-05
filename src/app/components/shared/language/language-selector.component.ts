import { Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { LanguageCode, LanguageService } from '../../../services/shared/language.service';

@Component({
  selector: 'app-language-selector',
  standalone: true,
  imports: [TranslatePipe],
  template: `
    <select
      [value]="languageService.getCurrentLanguage()"
      (change)="onLanguageChange($event)"
      class="bg-white text-primary-600 px-3 py-1 rounded-full font-medium shadow-sm"
    >
      <option value="hu">{{ 'language.hungarian' | translate }}</option>
      <option value="en">{{ 'language.english' | translate }}</option>
      <option value="de">{{ 'language.german' | translate }}</option>
    </select>
  `,
})
export class LanguageSelectorComponent {
  constructor(public languageService: LanguageService) {}

  onLanguageChange(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) {
      return;
    }

    const value = target.value;
    if (!isLanguageCode(value)) {
      return;
    }

    this.languageService.setLanguage(value);
  }
}

function isLanguageCode(value: string): value is LanguageCode {
  return value === 'hu' || value === 'en' || value === 'de';
}
