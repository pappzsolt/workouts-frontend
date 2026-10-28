import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { SidePaginationComponent } from './side-pagination.component';

describe('SidePaginationComponent layouts', () => {
  beforeEach(() => TestBed.configureTestingModule({
    imports: [SidePaginationComponent], providers: [provideTranslateService()],
  }));

  it('keeps the separate page count and side arrows by default', () => {
    const fixture = TestBed.createComponent(SidePaginationComponent);
    fixture.componentRef.setInput('totalPages', 4);
    fixture.detectChanges();
    const host: HTMLElement = fixture.nativeElement;
    expect(host.querySelector('[aria-live]')?.textContent?.trim()).toBe('1 / 4');
    expect(host.querySelector('[aria-live]')?.classList.contains('mt-5')).toBeTrue();
    expect(host.querySelector('app-button')?.classList.contains('absolute')).toBeTrue();
    expect(host.querySelector('button')?.classList.contains('btn-outline')).toBeTrue();
  });

  it('places the count between compact navigation buttons and preserves page boundaries', () => {
    const fixture = TestBed.createComponent(SidePaginationComponent);
    fixture.componentRef.setInput('totalPages', 4);
    fixture.componentRef.setInput('compact', true);
    fixture.detectChanges();
    const host: HTMLElement = fixture.nativeElement;
    const count = host.querySelector('[aria-live]')!;
    expect(count.previousElementSibling?.tagName).toBe('APP-BUTTON');
    expect(count.nextElementSibling?.tagName).toBe('APP-BUTTON');
    expect(host.querySelectorAll('[aria-live]').length).toBe(1);
    const buttons = host.querySelectorAll('button');
    expect(buttons[0].disabled).toBeTrue();
    expect(buttons[1].classList.contains('btn-primary')).toBeTrue();
    expect(buttons[1].classList.contains('min-h-12')).toBeTrue();
    expect(buttons[1].classList.contains('shadow-md')).toBeTrue();
    expect(buttons[0].textContent).toContain('common.previous');
    expect(buttons[1].textContent).toContain('common.next');
    expect(buttons[0].querySelector('app-icon')).not.toBeNull();
    expect(buttons[1].querySelector('app-icon')).not.toBeNull();
    const emit = spyOn(fixture.componentInstance.pageChange, 'emit');
    buttons[1].click();
    expect(emit).toHaveBeenCalledOnceWith(2);
    fixture.componentRef.setInput('currentPage', 4);
    fixture.detectChanges();
    expect(buttons[1].disabled).toBeTrue();
    expect(count.textContent?.trim()).toBe('4 / 4');
  });

  it('hides navigation for a single page in compact mode', () => {
    const fixture = TestBed.createComponent(SidePaginationComponent);
    fixture.componentRef.setInput('totalPages', 1);
    fixture.componentRef.setInput('compact', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('button')).toBeNull();
    expect(fixture.nativeElement.querySelector('[aria-live]')).toBeNull();
  });
});
