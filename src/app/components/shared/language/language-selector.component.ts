import { Component } from '@angular/core';
import { AppSelectComponent } from '../components/app-select/app-select.component';
import type { SelectOption } from '../../../models/common/select-option.model';

import { LanguageCode, LanguageService } from '../../../services/shared/language.service';

@Component({
  selector: 'app-language-selector',
  standalone: true,
  imports: [AppSelectComponent],
  template: `
    <app-select
      [value]="languageService.getCurrentLanguage()"
      [options]="languageOptions"
      (valueChange)="onLanguageChange($event)"
      className="bg-white text-primary-600 px-3 py-1 rounded-full font-medium shadow-sm"
    ></app-select>
  `,
})
export class LanguageSelectorComponent {
  readonly languageOptions: SelectOption<LanguageCode>[] = [
    { value: 'hu', label: 'language.hungarian' },
    { value: 'en', label: 'language.english' },
    { value: 'de', label: 'language.german' },
  ];

  constructor(public languageService: LanguageService) {}

  onLanguageChange(value: LanguageCode): void {
    this.languageService.setLanguage(value);
  }
}
