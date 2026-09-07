import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { LanguageService } from '../../../services/shared/language.service';

@Component({
  selector: 'app-language-selector',
  standalone: true,
  imports: [CommonModule],
  template: `
    <select
      [value]="languageService.getCurrentLanguage()"
      (change)="onLanguageChange($event)"
      class="bg-white text-blue-600 px-3 py-1 rounded-full font-medium shadow-sm"
    >
      <option value="hu">Magyar</option>
      <option value="en">English</option>
    </select>
  `,
})
export class LanguageSelectorComponent {
  constructor(public languageService: LanguageService) {}

  onLanguageChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.languageService.setLanguage(select.value as 'hu' | 'en');
  }
}
