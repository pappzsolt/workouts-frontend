import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppCardComponent } from './app-card.component';

@Component({
  standalone: true,
  imports: [AppCardComponent],
  template: `
    <app-card [routerLink]="link" [queryParams]="{ workout: 70 }" [showHeader]="true">
      <h2 cardHeader>Program</h2>
      <p>Workout</p>
    </app-card>
  `,
})
class CardHostComponent {
  link: AppCardComponent['routerLink'] = null;
}

describe('AppCardComponent', () => {
  it('renders a native link for route commands and keeps the static card non-interactive', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(CardHostComponent);
    const host: HTMLElement = fixture.nativeElement;

    fixture.detectChanges();
    expect(host.querySelector('app-card a')).toBeNull();
    expect(host.querySelector('header h2')?.textContent).toBe('Program');

    fixture.componentInstance.link = ['/coach/clients', 7];
    fixture.detectChanges();
    expect(host.querySelector('app-card a')?.getAttribute('href')).toBe('/coach/clients/7?workout=70');
    expect(host.querySelector('a header h2')?.textContent).toBe('Program');
    expect(host.querySelector('a p')?.textContent).toBe('Workout');
  });
});
