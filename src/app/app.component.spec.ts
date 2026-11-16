import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { AppComponent } from './app.component';
import { APP_VERSION } from './config/app-version';
import { BackNavigationService } from './services/shared/back-navigation.service';
import { SeoService } from './services/shared/seo.service';

@Component({ standalone: true, template: '<p>Test page</p>' })
class TestPageComponent {}

describe('Application footer', () => {
  it('renders exactly one shared footer across route changes', async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([
          { path: 'login', component: TestPageComponent },
          { path: 'user/dashboard', component: TestPageComponent },
        ]),
        provideTranslateService(),
        { provide: SeoService, useValue: {} },
        { provide: BackNavigationService, useValue: {} },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(AppComponent);
    const router = TestBed.inject(Router);
    fixture.detectChanges();

    const appShell: HTMLElement = fixture.nativeElement.querySelector('div');
    expect(appShell.className).toContain('min-h-[100dvh]');

    for (const url of ['/login', '/user/dashboard']) {
      await router.navigateByUrl(url);
      fixture.detectChanges();
      const footers = fixture.nativeElement.querySelectorAll('footer');
      expect(footers.length).withContext(url).toBe(1);
      expect(footers[0].textContent).toContain(`v${APP_VERSION}`);
      expect(footers[0].style.paddingBottom).toContain('safe-area-inset-bottom');
      expect(footers[0].classList.contains('shrink-0')).toBeTrue();
      expect(footers[0].classList.contains('fixed')).toBeFalse();
    }
  });
});
