import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { BehaviorSubject } from 'rxjs';
import { UserProgramStatisticsService } from './user-program-statistics.service';
import { UserProgramStatisticsComponent } from '../../components/user-dashboard/operations/program-statistics/program-statistics.component';
import { LanguageService } from '../shared/language.service';
import { LoggerService } from '../logger.service';
import { API_ENDPOINTS } from '../../api-endpoints';

const metrics = {
  estimatedOneRepMaxKg: '93.33', bestSingleKg: null, referenceOneRepMaxKg: '106.67',
  relativeIntensityPercent: '65.63', topSetWeightKg: '70', topSetRepetitions: 10,
  workoutCount: 1, activeDays: 1, targetRepetitions: 12, targetVolumeKg: '900',
  averagePrescribedRestSeconds: '90', repsBelow60Percent: 0, reps60To80Percent: 10,
  repsAtLeast80Percent: 0, estimatedOneRepMaxPr: false, maxWeightPr: false,
};
const exercise = {
  exerciseId: 10, exerciseName: 'Fekvenyomás', weeks: [
    { week: 1, completedSets: 1, repetitions: 10, volumeKg: '700', volumeChangePercent: null,
      maxWeightKg: '70', maxWeightChangeKg: null, maxWeightChangePercent: null, metrics },
    { week: 2, completedSets: 1, repetitions: 10, volumeKg: '800', volumeChangePercent: '14.29',
      maxWeightKg: '80', maxWeightChangeKg: '10', maxWeightChangePercent: '14.29',
      metrics: { ...metrics, estimatedOneRepMaxKg: '106.67', topSetWeightKg: '80', estimatedOneRepMaxPr: true, maxWeightPr: true } },
  ],
};
function response(exerciseStatistics?: unknown[]) {
  return { success: true, message: null, data: {
    totalPrograms: 1, completedPrograms: 0, programs: [{
      programId: 1, programName: 'Program', totalWorkouts: 2, completedWorkouts: 1,
      incompleteWorkouts: 1, completed: false, weeklyVolumes: [], exerciseStatistics,
    }],
  } };
}

describe('Program exercise weekly comparison', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [UserProgramStatisticsComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideTranslateService(),
        { provide: LanguageService, useValue: { language$: new BehaviorSubject('hu') } },
        { provide: LoggerService, useValue: { error: () => undefined } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('maps decimal values and keeps absent comparisons null', () => {
    TestBed.inject(UserProgramStatisticsService).getProgramStatistics('hu').subscribe(result => {
      const weeks = result.data!.programs[0].exerciseStatistics[0].weeks;
      expect(weeks[0].maxWeightKg).toBe(70);
      expect(weeks[0].metrics!.estimatedOneRepMaxKg).toBe(93.33);
      expect(weeks[0].metrics!.bestSingleKg).toBeNull();
      expect(weeks[0].metrics!.referenceOneRepMaxKg).toBe(106.67);
      expect(weeks[0].metrics!.relativeIntensityPercent).toBe(65.63);
      expect(weeks[0].metrics!.targetVolumeKg).toBe(900);
      expect(weeks[0].metrics!.averagePrescribedRestSeconds).toBe(90);
      expect(weeks[1].metrics!.estimatedOneRepMaxPr).toBeTrue();
      expect(weeks[0].maxWeightChangePercent).toBeNull();
      expect(weeks[1].volumeKg).toBe(800);
      expect(weeks[1].volumeChangePercent).toBe(14.29);
      expect(weeks[1].maxWeightChangeKg).toBe(10);
      expect(weeks[1].maxWeightChangePercent).toBe(14.29);
    });
    http.expectOne(API_ENDPOINTS.userProgramStatistics + '?language=hu').flush(response([exercise]));
  });

  it('accepts a response without the new optional exercise data', () => {
    TestBed.inject(UserProgramStatisticsService).getProgramStatistics('hu').subscribe(result => {
      expect(result.data!.programs[0].exerciseStatistics).toEqual([]);
    });
    http.expectOne(API_ENDPOINTS.userProgramStatistics + '?language=hu').flush(response());
  });

  it('renders scheduled adherence including incomplete sets without scoring future weeks', () => {
    const fixture = TestBed.createComponent(UserProgramStatisticsComponent);
    fixture.detectChanges();
    http.expectOne(API_ENDPOINTS.userProgramStatistics + '?language=hu').flush(response([{
      ...exercise, planWeeks: [
        { week: 1, futureWeek: false, plannedSets: 2, completedSets: 1, completionPercent: '50.00',
          targetRepetitions: 20, actualRepetitions: 10, targetVolumeKg: '1500', actualVolumeKg: '700' },
        { week: 3, futureWeek: true, plannedSets: 2, completedSets: 0, completionPercent: null,
          targetRepetitions: 20, actualRepetitions: 0, targetVolumeKg: '1500', actualVolumeKg: '0' },
      ],
    }]));
    fixture.detectChanges();
    const plans = fixture.componentInstance.programs[0].exerciseStatistics[0].planWeeks;
    expect(plans[0].completionPercent).toBe(50);
    expect(plans[0].targetVolumeKg).toBe(1500);
    expect(plans[0].actualVolumeKg).toBe(700);
    expect(plans[1].completionPercent).toBeNull();
    const tables = (fixture.nativeElement as HTMLElement).querySelectorAll('table');
    const rows = tables[1].querySelectorAll('tbody tr');
    expect(rows[0].textContent).toContain('1 / 2');
    expect(rows[0].textContent).toContain('50%');
    expect(rows[1].textContent).not.toContain('0%');
    expect(rows[1].textContent).toContain('—');
    fixture.destroy();
  });

  it('only sums three distinct SBD lifts with estimates in the same program week', () => {
    const lift = (id: number, baseline: number) => ({
      ...exercise, exerciseId: id, exerciseName: 'Lift ' + id,
      weeks: exercise.weeks.map((week, index) => ({
        ...week, metrics: { ...metrics, estimatedOneRepMaxKg: String(baseline + index * 10),
          bestSingleKg: index === 0 ? String(baseline - 10) : null },
      })),
    });
    const fixture = TestBed.createComponent(UserProgramStatisticsComponent);
    fixture.detectChanges();
    http.expectOne(API_ENDPOINTS.userProgramStatistics + '?language=hu')
      .flush(response([lift(10, 100), lift(20, 200), lift(30, 300)]));
    const component = fixture.componentInstance;
    const program = component.programs[0];
    expect(component.sbdWeeks(program)).toEqual([]);
    component.setSbdExercise(1, 0, 10);
    component.setSbdExercise(1, 1, 20);
    component.setSbdExercise(1, 2, 30);
    expect(component.sbdWeeks(program)).toEqual([
      { week: 1, estimatedTotalKg: 600, singleTotalKg: 570 },
      { week: 2, estimatedTotalKg: 630, singleTotalKg: null },
    ]);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('630 kg');
    expect(component.sbdWeeks({ ...program, programId: 2 })).toEqual([]);
    component.setSbdExercise(1, 2, 20);
    expect(component.sbdWeeks(program)).toEqual([]);
    component.setSbdExercise(1, 2, 30);
    program.exerciseStatistics[2].weeks[1].metrics!.estimatedOneRepMaxKg = null;
    expect(component.sbdWeeks(program).map(week => week.week)).toEqual([1]);
    fixture.destroy();
  });

  it('renders separate volume and maximum weight changes inside the program', () => {
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('hu', { userProgramStatistics: {
      exerciseComparison: 'Gyakorlatok', noComparison: 'Nem számolható', weekLabel: '{{week}}. hét',
    } });
    translate.use('hu');
    const fixture = TestBed.createComponent(UserProgramStatisticsComponent);
    fixture.detectChanges();
    http.expectOne(API_ENDPOINTS.userProgramStatistics + '?language=hu').flush(response([exercise]));
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('section[aria-labelledby="exercise-comparison-title"] details > summary')!.textContent).toContain('Fekvenyomás');
    expect(element.textContent).toContain('93.33 kg');
    expect(element.textContent).toContain('10 × 70 kg');
    expect(element.textContent).toContain('65.63%');
    expect(element.textContent).toContain('900 / 700 kg');
    expect(element.textContent).toContain('90 s');
    const rows = element.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('Nem számolható');
    expect(rows[1].textContent).toContain('800 kg');
    expect(rows[1].textContent).toContain('80 kg');
    expect(rows[1].textContent).toContain('+10 kg');
    expect(rows[1].textContent).toContain('+14.29%');
    fixture.destroy();
  });
});
