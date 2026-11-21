import { AfterViewInit, Directive, ElementRef, EventEmitter, Input, NgZone, OnChanges, OnDestroy, Output, SimpleChanges, inject } from '@angular/core';

/** Request an authenticated screenshot only when its thumbnail approaches the viewport. */
@Directive({
  selector: '[appPreviewOnView]',
  standalone: true,
})
export class BugReportPreviewVisibleDirective implements AfterViewInit, OnChanges, OnDestroy {
  @Input('appPreviewOnView') revision = 0;
  @Output() readonly previewVisible = new EventEmitter<void>();

  private readonly element = inject(ElementRef<HTMLElement>);
  private readonly zone = inject(NgZone);
  private observer: IntersectionObserver | null = null;
  private destroyed = false;
  private viewReady = false;

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.observe();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // @for may reuse a thumbnail element after reload. Reobserve for the new page data.
    if (this.viewReady && changes['revision']) this.observe();
  }

  private observe(): void {
    this.observer?.disconnect();
    this.observer = null;
    if (typeof IntersectionObserver === 'undefined') {
      // Older browsers still receive thumbnails, with bounded request concurrency.
      Promise.resolve().then(() => {
        if (!this.destroyed) this.previewVisible.emit();
      });
      return;
    }
    this.zone.runOutsideAngular(() => {
      const observer = new IntersectionObserver(entries => {
        if (this.observer !== observer || !entries.some(entry => entry.isIntersecting)) return;
        observer.disconnect();
        this.observer = null;
        this.zone.run(() => this.previewVisible.emit());
      }, { rootMargin: '250px 0px' });
      this.observer = observer;
      observer.observe(this.element.nativeElement);
    });
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.observer?.disconnect();
    this.observer = null;
  }
}
