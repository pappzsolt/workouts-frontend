import { Directive, Input } from '@angular/core';

@Directive({ selector: 'table[appTable]', standalone: true, host: { '[class]': 'classes' } })
export class AppTableDirective {
  @Input() appTable: '' | 'default' | 'plain' = 'default';
  get classes(): string {
    return this.appTable === 'plain' ? '' : 'w-full border-collapse text-left';
  }
}
@Directive({ selector: 'th[appTableHeader]', standalone: true, host: { '[class]': 'classes' } })
export class AppTableHeaderDirective {
  @Input() appTableHeader: '' | 'default' | 'comfortable' | 'plain' = 'default';
  get classes(): string {
    return this.appTableHeader === 'plain'
      ? ''
      : (this.appTableHeader === 'comfortable' ? 'px-5' : 'px-4') +
          ' py-4 text-xs font-bold uppercase tracking-wider text-content-600';
  }
}
@Directive({ selector: 'td[appTableCell]', standalone: true, host: { '[class]': 'classes' } })
export class AppTableCellDirective {
  @Input() appTableCell: '' | 'default' | 'comfortable' | 'plain' = 'default';
  get classes(): string {
    return this.appTableCell === 'plain'
      ? ''
      : (this.appTableCell === 'comfortable' ? 'px-5' : 'px-4') + ' py-4 align-top text-sm';
  }
}
