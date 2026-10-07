import {
  Component,
  ContentChildren,
  Directive,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  Output,
  QueryList,
  inject,
  forwardRef,
  OnChanges,
} from '@angular/core';

let nextTabsId = 0;
@Component({
  selector: 'app-tabs',
  standalone: true,
  host: { style: 'display: contents' },
  template:
    '<div role="tablist" [attr.aria-label]="ariaLabel || null" [class]="containerClass"><ng-content /></div>',
})
export class AppTabsComponent implements OnChanges {
  focusedTab: string | null = null;
  ngOnChanges(): void {
    this.focusedTab = this.activeTab;
  }
  private readonly id = `app-tabs-${++nextTabsId}`;
  @Input() activeTab = '';
  @Input() ariaLabel = '';
  @Input() containerClass = '';
  @Output() readonly activeTabChange = new EventEmitter<string>();
  @ContentChildren(forwardRef(() => AppTabDirective), { descendants: true })
  tabs!: QueryList<AppTabDirective>;
  tabId(value: string): string {
    return `${this.id}-tab-${encodeURIComponent(value)}`;
  }
  panelId(value: string): string {
    return `${this.id}-panel-${encodeURIComponent(value)}`;
  }
  select(tab: AppTabDirective): void {
    if (!tab.element.nativeElement.disabled) this.activeTabChange.emit(tab.appTab);
  }
  moveFocus(tab: AppTabDirective, event: KeyboardEvent): void {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    const available = this.tabs.toArray().filter((item) => !item.element.nativeElement.disabled);
    if (!available.length) return;
    const index = available.indexOf(tab);
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? available.length - 1
          : (index + (event.key === 'ArrowRight' ? 1 : -1) + available.length) % available.length;
    event.preventDefault();
    this.focusedTab = available[next].appTab;
    available[next].element.nativeElement.focus();
    // Manual activation: arrow keys move focus without changing the displayed workout list.
  }
}
@Directive({
  selector: 'button[appTab]',
  standalone: true,
  host: {
    role: 'tab',
    '[attr.id]': 'owner.tabId(appTab)',
    '[attr.aria-controls]': 'owner.panelId(appTab)',
    '[attr.aria-selected]': 'owner.activeTab === appTab',
    '[attr.tabindex]':
      '!element.nativeElement.disabled && (owner.focusedTab ?? owner.activeTab) === appTab ? 0 : -1',
  },
})
export class AppTabDirective {
  @Input({ required: true }) appTab = '';
  readonly owner = inject(AppTabsComponent);
  readonly element = inject<ElementRef<HTMLButtonElement>>(ElementRef);
  @HostListener('click') onClick(): void {
    this.owner.select(this);
  }
  @HostListener('keydown', ['$event']) onKeydown(event: KeyboardEvent): void {
    this.owner.moveFocus(this, event);
  }
}
