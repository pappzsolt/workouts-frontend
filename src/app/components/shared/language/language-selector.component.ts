import { Component } from '@angular/core';

import { LanguageCode, LanguageService } from '../../../services/shared/language.service';

@Component({
  selector: 'app-language-selector',
  standalone: true,
  template: `
    <select
      [value]="languageService.getCurrentLanguage()"
      (change)="onLanguageChange($event)"
      class="bg-white text-primary-600 px-3 py-1 rounded-full font-medium shadow-sm"
    >
      <option value="hu">Magyar</option>
      <option value="en">English</option>
      <option value="de">Deutsch</option>
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
