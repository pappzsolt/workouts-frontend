import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { PreviousExercisePerformanceComponent } from './previous-exercise-performance.component';
import { API_ENDPOINTS } from '../../../../../api-endpoints';

describe('Previous exercise performance', () => {
  let fixture: ComponentFixture<PreviousExercisePerformanceComponent>;
  let http: HttpTestingController;
  const url = (workout = 10, exercise = 6) =>
    API_ENDPOINTS.previousExercisePerformance(workout, exercise);
  const text = () => fixture.nativeElement.textContent as string;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PreviousExercisePerformanceComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideTranslateService()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(PreviousExercisePerformanceComponent);
    fixture.componentRef.setInput('userWorkoutId', 10);
    fixture.componentRef.setInput('exerciseId', 6);
    fixture.detectChanges();
  });
  afterEach(() => {
    fixture.destroy();
    http.verify();
  });

  it('renders actual results, zero and missing values without changing current workout values', () => {
    expect(text()).toContain('previousPerformance.loading');
    http.expectOne(url()).flush({
      success: true,
      data: {
        userWorkoutId: 8,
        performedAt: '2026-10-20T10:15:00',
        sets: [
          { setNumber: 1, actualRepetitions: 8, actualWeightKg: 42.5 },
          { setNumber: 2, actualRepetitions: 0, actualWeightKg: 0 },
          { setNumber: 3, actualRepetitions: 10, actualWeightKg: null },
        ],
      },
      message: null,
    });
    fixture.detectChanges();
    expect(text()).toContain('42.5 kg × 8');
    expect(text()).toContain('0 kg × 0');
    expect(text()).toContain('— kg × 10');
    expect(text()).toContain('2026.10.20.');
    expect(fixture.nativeElement.querySelector('input')).toBeNull();
  });

  it('shows an empty state for a first-time exercise', () => {
    http.expectOne(url()).flush({ success: true, data: null, message: null });
    fixture.detectChanges();
    expect(text()).toContain('previousPerformance.empty');
    expect(text()).not.toContain('previousPerformance.error');
  });

  it('can retry a failed history request without blocking the workout', () => {
    http.expectOne(url()).flush({}, { status: 503, statusText: 'Unavailable' });
    fixture.detectChanges();
    expect(text()).toContain('previousPerformance.error');
    fixture.nativeElement.querySelector('button').click();
    fixture.detectChanges();
    http.expectOne(url()).flush({ success: true, data: null, message: null });
    fixture.detectChanges();
    expect(text()).toContain('previousPerformance.empty');
  });

  it('cancels stale requests when navigating to another exercise', () => {
    const stale = http.expectOne(url());
    fixture.componentRef.setInput('exerciseId', 7);
    fixture.detectChanges();
    expect(stale.cancelled).toBeTrue();
    http.expectOne(url(10, 7)).flush({ success: true, data: null, message: null });
    fixture.detectChanges();
    expect(text()).toContain('previousPerformance.empty');
  });

  it('treats unsuccessful envelopes as an error, not as missing history', () => {
    http.expectOne(url()).flush({ success: false, data: null, message: 'Failed' });
    fixture.detectChanges();
    expect(text()).toContain('previousPerformance.error');
  });
});
