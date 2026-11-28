import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { AuthService } from '../../services/auth/auth.service';
import { LanguageService } from '../../services/shared/language.service';
import { LayoutComponent } from './layout.component';

describe('LayoutComponent', () => {
  it('moves focus to the main content without navigating when the skip link is activated', () => {
    TestBed.configureTestingModule({
      imports: [LayoutComponent],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        { provide: AuthService, useValue: {
          getUserName: () => null, getUserRole: () => null,
          isAdmin: () => false, isCoach: () => false, isUser: () => false,
        } },
        { provide: LanguageService, useValue: { getCurrentLanguage: () => 'hu' } },
      ],
    });
    const fixture = TestBed.createComponent(LayoutComponent);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    const link = element.querySelector<HTMLAnchorElement>('a[href="#main-content"]')!;
    const main = element.querySelector<HTMLElement>('main#main-content')!;
    const router = TestBed.inject(Router);
    const url = router.url;

    expect(element.querySelector('a, button, input, select')).toBe(link);
    link.focus();
    link.click();

    expect(document.activeElement).toBe(main);
    expect(router.url).toBe(url);
  });
});
