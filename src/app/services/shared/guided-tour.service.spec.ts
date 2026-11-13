import { TestBed } from '@angular/core/testing';
import { GuidedTourService, GUIDE_STEPS } from './guided-tour.service';
import { LanguageService } from './language.service';

describe('GuidedTourService', () => {
  let service: GuidedTourService;
  const keys = [
    'workouts-guided-tour:v1:user:90301',
    'workouts-guided-tour:v1:user:90302',
    'workouts-guided-tour:v1:coach:90301',
  ];

  beforeEach(() => {
    keys.forEach(key => localStorage.removeItem(key));
    TestBed.configureTestingModule({
      providers: [
        GuidedTourService,
        { provide: LanguageService, useValue: { getCurrentLanguage: () => 'hu' } },
      ],
    });
    service = TestBed.inject(GuidedTourService);
  });

  afterEach(() => keys.forEach(key => localStorage.removeItem(key)));

  it('offers the user guide on the first login and remembers an explicit dismissal', () => {
    service.offerFirstVisit('user', 90301);
    expect(service.active()?.role).toBe('user');
    expect(service.active()?.index).toBe(0);
    service.dismiss();
    service.offerFirstVisit('user', 90301);
    expect(service.active()).toBeNull();
  });

  it('keeps progress separate for each account and role', () => {
    service.offerFirstVisit('user', 90301);
    service.dismiss();
    service.offerFirstVisit('user', 90302);
    expect(service.active()?.userId).toBe(90302);
    service.dismiss();
    service.offerFirstVisit('coach', 90301);
    expect(service.active()?.role).toBe('coach');
  });

  it('restarts the tour from the menu even after the first offer has been dismissed', () => {
    service.offerFirstVisit('user', 90301);
    service.dismiss();
    service.start('user', 90301);
    expect(service.active()?.index).toBe(0);
    expect(service.labels.helpUser).toBe('Felhasználói útmutató');
  });

  it('does not advance beyond the end, or go backward before the start', () => {
    service.start('coach', 90301);
    service.previous();
    expect(service.active()?.index).toBe(0);
    for (let i = 0; i < GUIDE_STEPS.coach.length + 3; i++) service.next();
    expect(service.active()?.index).toBe(GUIDE_STEPS.coach.length - 1);
    service.previous();
    expect(service.active()?.index).toBe(GUIDE_STEPS.coach.length - 2);
  });

  it('does not store completion simply because the user logged out', () => {
    service.offerFirstVisit('user', 90301);
    service.resetOnLogout();
    service.offerFirstVisit('user', 90301);
    expect(service.active()?.role).toBe('user');
  });

  it('uses only allowed role-specific routes', () => {
    expect(GUIDE_STEPS.user.every(step => step.route.startsWith('/user/'))).toBeTrue();
    expect(GUIDE_STEPS.coach.every(step => step.route.startsWith('/coach/'))).toBeTrue();
    expect(GUIDE_STEPS.user.every(step => !!step.text.hu && !!step.text.en && !!step.text.de)).toBeTrue();
  });
});
