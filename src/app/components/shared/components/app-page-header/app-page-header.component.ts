import { Component, Directive, Input } from '@angular/core';

/** Project the original heading level, icons and actions; no navigation or data logic. */
@Component({
  selector: 'app-page-header, div[appPageHeader], header[appPageHeader]',
  standalone: true,
  host: { '[class]': 'classes' },
  template: '<ng-content />',
})
export class AppPageHeaderComponent {
  @Input() appPageHeader: '' | 'center' | 'actions' | 'plain' = 'center';
  get classes(): string {
    return this.appPageHeader === 'center' || this.appPageHeader === ''
      ? 'text-center'
      : this.appPageHeader === 'actions'
        ? 'flex flex-wrap items-center justify-between gap-3'
        : '';
  }
}
@Component({
  selector: 'app-section-header, div[appSectionHeader], header[appSectionHeader]',
  standalone: true,
  host: { '[class]': 'classes' },
  template: '<ng-content />',
})
export class AppSectionHeaderComponent {
  @Input() appSectionHeader: '' | 'default' | 'plain' = 'default';
  get classes(): string {
    return this.appSectionHeader === 'plain'
      ? ''
      : 'flex flex-wrap items-center justify-between gap-2';
  }
}

@Directive({
  selector: 'h1[appHeading], h2[appHeading], h3[appHeading], h4[appHeading]',
  standalone: true,
  host: { '[class]': 'classes' },
})
export class AppHeadingDirective {
  @Input() appHeading: 'page' | 'section' | 'compact' = 'page';
  get classes(): string {
    return {
      page: 'text-2xl font-bold tracking-tight text-content-800 sm:text-3xl',
      section: 'text-lg font-bold text-content-800 sm:text-xl',
      compact: 'text-base font-bold text-content-800',
    }[this.appHeading];
  }
}
