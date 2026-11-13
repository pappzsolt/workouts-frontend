import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { Router } from '@angular/router';
import { GuidedTourComponent } from './guided-tour.component';
import { GuidedTourService } from '../../../services/shared/guided-tour.service';
import { LanguageService } from '../../../services/shared/language.service';

describe('GuidedTourComponent', () => {
  let tour: GuidedTourService;
  const routerEvents = new Subject<unknown>();
  let currentUrl = '/user/dashboard';
  const routerStub = {
    get url(): string { return currentUrl; },
    set url(value: string) { currentUrl = value; },
    events: routerEvents.asObservable(),
    navigateByUrl: jasmine.createSpy('navigateByUrl').and.callFake(async (url: string) => {
      currentUrl = url;
      return true;
    }),
  };

  beforeEach(async () => {
    localStorage.removeItem('workouts-guided-tour:v1:user:90303');
    routerStub.url = '/user/dashboard';
    routerStub.navigateByUrl.calls.reset();
    await TestBed.configureTestingModule({
      imports: [GuidedTourComponent],
      providers: [
        GuidedTourService,
        { provide: LanguageService, useValue: { getCurrentLanguage: () => 'hu' } },
        { provide: Router, useValue: routerStub },
      ],
    }).compileComponents();
    tour = TestBed.inject(GuidedTourService);
  });

  afterEach(() => localStorage.removeItem('workouts-guided-tour:v1:user:90303'));

  it('shows a real step-by-step dialog and can restart after dismissal', async () => {
    const fixture = TestBed.createComponent(GuidedTourComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
    tour.offerFirstVisit('user', 90303);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Itt kezdődik az edzésed');
    tour.next();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Edzésprogramjaid');
    tour.dismiss();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
    tour.start('user', 90303);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).not.toBeNull();
  });
});
