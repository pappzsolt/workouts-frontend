import { By } from '@angular/platform-browser';
import { AppIconComponent } from './app-icon/app-icon.component';
import { TestBed } from '@angular/core/testing';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { AppCardBannerComponent } from './app-card-banner/app-card-banner.component';
import { AppStatus, AppStatusBadgeComponent } from './app-status-badge/app-status-badge.component';

const classes = (element: HTMLElement) => [...element.classList].sort();
const expectedClasses = (value: string) => value.split(' ').sort();

describe('Shared card presentation compatibility', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [AppCardBannerComponent, AppStatusBadgeComponent], providers: [provideTranslateService()] });
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('hu', { userMyPrograms: { completed: 'Teljesítve', inProgress: 'Folyamatban' } });
    translate.use('hu');
  });

  it('preserves the default banner dimensions, decoration, and icon size', () => {
    const fixture = TestBed.createComponent(AppCardBannerComponent);
    fixture.componentRef.setInput('icon', 'dumbbell');
    fixture.detectChanges();
    const root = fixture.nativeElement.querySelector('div') as HTMLElement;
    expect(classes(root)).toEqual(expectedClasses('flex h-28 items-center justify-center bg-gradient-to-r from-primary-700 to-primary-800'));
    expect(root.querySelectorAll('div').length).toBe(0);
    expect(root.querySelector('span')?.getAttribute('aria-hidden')).toBe('true');
    expect(fixture.componentInstance.variant).toBe('compact');
    expect(fixture.debugElement.query(By.directive(AppIconComponent)).componentInstance.sizeClass).toBe('h-5 w-5');
  });

  it('preserves the program banner classes, decorative circles, and larger icon', () => {
    const fixture = TestBed.createComponent(AppCardBannerComponent);
    fixture.componentRef.setInput('icon', 'dumbbell');
    fixture.componentRef.setInput('variant', 'decorated');
    fixture.detectChanges();
    const root = fixture.nativeElement.querySelector('div') as HTMLElement;
    expect(classes(root)).toEqual(expectedClasses('relative flex h-32 sm:h-44 items-center justify-center overflow-hidden bg-gradient-to-br from-primary-700 to-primary-800'));
    expect(root.querySelectorAll('div').length).toBe(2);
    expect(classes(root.querySelector('span')!)).toEqual(expectedClasses('relative flex h-20 w-20 items-center justify-center rounded-2xl bg-white/95 text-5xl shadow-lg ring-1 ring-white/30 transition duration-200 group-hover:scale-105'));
    expect(root.querySelector('span')?.hasAttribute('aria-hidden')).toBeFalse();
    expect(fixture.debugElement.query(By.directive(AppIconComponent)).componentInstance.sizeClass).toBe('h-8 w-8');
  });

  it('preserves every existing status badge class, label, icon, and size', () => {
    const old: [AppStatus, string, string, string][] = [
      ['done', 'success', 'circle-check', 'coachWorkspace.status.done'],
      ['inProgress', 'info', 'circle-play', 'coachWorkspace.status.inProgress'],
      ['missed', 'warning', 'triangle-alert', 'coachWorkspace.status.missed'],
      ['planned', 'neutral', 'calendar-clock', 'coachWorkspace.status.planned'],
      ['active', 'success', 'circle-play', 'coachWorkspace.client.active'],
      ['upcoming', 'warning', 'clock', 'coachWorkspace.client.upcoming'],
      ['finished', 'neutral', 'flag', 'coachWorkspace.client.finished'],
    ];
    const fixture = TestBed.createComponent(AppStatusBadgeComponent);
    for (const [status, color, icon, label] of old) {
      fixture.componentRef.setInput('status', status);
      fixture.detectChanges();
      const span = fixture.nativeElement.querySelector('span') as HTMLElement;
      expect(classes(span)).toEqual(expectedClasses(`badge badge-${color}`));
      expect(span.textContent?.trim()).toBe(label);
      expect(fixture.componentInstance.config.icon).toBe(icon);
      expect(fixture.debugElement.query(By.directive(AppIconComponent)).componentInstance.sizeClass).toBe('h-3.5 w-3.5');
    }
  });

  it('preserves the user program labels, colors, and icon sizes', () => {
    const fixture = TestBed.createComponent(AppStatusBadgeComponent);
    for (const [status, color, label, icon] of [
      ['programCompleted', 'bg-success-50 text-success-800', 'Teljesítve', 'circle-check'],
      ['programInProgress', 'bg-surface-100 text-content-600', 'Folyamatban', 'clock'],
    ]) {
      fixture.componentRef.setInput('status', status);
      fixture.detectChanges();
      const span = fixture.nativeElement.querySelector('span') as HTMLElement;
      expect(classes(span)).toEqual(expectedClasses(`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${color}`));
      expect(span.textContent?.trim()).toBe(label);
      expect(fixture.componentInstance.config.icon).toBe(icon);
      expect(fixture.debugElement.query(By.directive(AppIconComponent)).componentInstance.sizeClass).toBe('h-4 w-4');
    }
  });
});
